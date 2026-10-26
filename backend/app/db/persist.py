"""Database bootstrap + best-effort persistence.

Postgres is optional: local dev runs memory-first and every helper below
degrades to a no-op when the database is unreachable. The moment
DATABASE_URL points at a live server (e.g. Neon at deploy), tables are
created on boot and ledger records dual-write automatically.
"""
import json
import logging
import os
import uuid

log = logging.getLogger("intellirity.db")

DB_CONNECTED = False


async def init_db() -> bool:
    """Create tables if Postgres is reachable. Never crashes boot."""
    global DB_CONNECTED
    # The test suite and any offline tooling must never write to the live
    # database. Declaring the intent is explicit and greppable; silently
    # inheriting DATABASE_URL from .env is how a test run deletes data.
    if os.getenv("INTELLIRITY_DISABLE_DB", "").strip() in ("1", "true", "yes"):
        DB_CONNECTED = False
        log.info("database disabled by INTELLIRITY_DISABLE_DB: running memory-only")
        return False
    try:
        from app.db.session import engine
        from app.models.models import Base

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        DB_CONNECTED = True
        log.info("database connected: tables ensured")
    except Exception as exc:
        DB_CONNECTED = False
        log.warning("database unavailable, memory mode: %s", str(exc)[:160])
        return False
    # The ledger chain needs a monotonic sequence column; add it if the
    # table predates it.
    await ensure_ledger_seq()
    # Paid entitlements gained an expiry; existing rows get a grace period
    # on the next restore rather than being locked out.
    await ensure_entitlement_expiry()
    return DB_CONNECTED


def is_connected() -> bool:
    return DB_CONNECTED


async def ensure_ledger_seq() -> bool:
    """Add the chain sequence column to an existing ledger table.

    `create_all` creates missing tables but never adds a column to one
    that already exists, so a database created before the sequence
    existed needs this one-off (idempotent) migration.
    """
    if not DB_CONNECTED:
        return False
    try:
        from app.db.session import engine
        from sqlalchemy import text

        async with engine.begin() as conn:
            await conn.execute(text(
                "CREATE SEQUENCE IF NOT EXISTS ledger_records_seq_seq"
            ))
            await conn.execute(text(
                "ALTER TABLE ledger_records ADD COLUMN IF NOT EXISTS seq BIGINT"
            ))
            await conn.execute(text(
                "ALTER TABLE ledger_records ALTER COLUMN seq SET DEFAULT nextval('ledger_records_seq_seq')"
            ))
            await conn.execute(text(
                "UPDATE ledger_records SET seq = nextval('ledger_records_seq_seq') WHERE seq IS NULL"
            ))
            await conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_ledger_records_seq ON ledger_records (seq)"
            ))
        return True
    except Exception as exc:
        log.warning("ledger seq migration skipped: %s", str(exc)[:160])
        return False


async def append_ledger_record(payload: dict) -> dict | None:
    """Seal and store a ledger record as the next link in the chain.

    The append is serialized with a Postgres advisory lock and the record
    commits to the current database tail, so two processes appending at
    the same moment produce one linear chain rather than a fork.
    Returns the sealed record, or None when the database is unavailable.
    """
    if not DB_CONNECTED:
        return None
    try:
        from app.db.session import async_session
        from app.models.models import LedgerRecord
        from app.services.modules import blackbox_ledger as ledger_mod
        from sqlalchemy import select, text

        async with async_session() as session:
            # Serialize appends across every process using this database.
            await session.execute(text("SELECT pg_advisory_xact_lock(739261)"))
            tail = (await session.execute(
                select(LedgerRecord).order_by(LedgerRecord.seq.desc()).limit(1)
            )).scalars().first()
            prev_hash = tail.merkle_hash if tail and tail.merkle_hash else "0" * 64

            record = ledger_mod.seal(ledger_mod.build_record(payload, prev_hash))
            session.add(LedgerRecord(
                id=record["record_id"],
                timestamp=_parse_ts(record.get("timestamp")),
                ai_decision=record.get("ai_decision", ""),
                prompt_hash=record.get("prompt_hash"),
                action_taken=record.get("action_taken", ""),
                confidence_score=record.get("confidence_score", 0.0),
                previous_hash=record.get("previous_hash", ""),
                merkle_hash=record.get("merkle_hash", ""),
                record_json=json.dumps(record, default=str),
            ))
            await session.commit()
        return record
    except Exception as exc:
        log.warning("ledger append skipped: %s", str(exc)[:160])
        return None


def _parse_ts(raw):
    if not raw:
        return None
    from datetime import datetime
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


async def persist_ledger_record(record: dict) -> bool:
    """Best-effort dual-write of a sealed ledger record. Never raises."""
    if not DB_CONNECTED or not isinstance(record, dict):
        return False
    try:
        from app.db.session import async_session
        from app.models.models import LedgerRecord
        from datetime import datetime

        # Store the record's own timestamp, not the insert time, so the
        # database order matches the chain order.
        ts = None
        raw_ts = record.get("timestamp")
        if raw_ts:
            try:
                ts = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
            except (TypeError, ValueError):
                ts = None

        async with async_session() as session:
            session.add(LedgerRecord(
                id=str(record.get("record_id", "")),
                timestamp=ts,
                ai_decision=str(record.get("ai_decision", "")),
                prompt_hash=record.get("prompt_hash"),
                action_taken=str(record.get("action_taken", "")),
                confidence_score=record.get("confidence_score", 0.0),
                previous_hash=str(record.get("previous_hash", "")),
                merkle_hash=str(record.get("merkle_hash", "")),
                record_json=json.dumps(record, default=str),
            ))
            await session.commit()
        return True
    except Exception as exc:
        log.warning("ledger persist skipped: %s", str(exc)[:160])
        return False


async def sync_ledger_chain(limit: int = 5000, rebuild: bool = False) -> int:
    """Pull in ledger records written by other processes.

    The chain is a single global sequence, but the engine may run in more
    than one process (a serverless platform, or a dev server and a test
    run side by side). Each process keeps the chain in memory, so before
    appending or verifying, it takes the records the database has that it
    does not. Without this, two processes interleave in the table and the
    chain no longer verifies.

    rebuild=True replaces the in-memory chain with the database's, which
    is what a process must do when the database is the authority for the
    next append: the record it sealed locally would otherwise sit in the
    chain ahead of the one the database sealed.
    """
    if not DB_CONNECTED:
        return 0
    if rebuild:
        try:
            from app.services.modules import blackbox_ledger as ledger_mod

            ledger_mod._ledger.clear()
            ledger_mod._prev_hash = "0" * 64
        except Exception:
            pass
    return await restore_ledger_chain(limit=limit)


async def restore_ledger_chain(limit: int = 5000) -> int:
    """Reload sealed history into the in-memory chain so restarts continue
    (not fork) the ledger and verify covers full history. Returns count."""
    if not DB_CONNECTED:
        return 0
    try:
        from app.db.session import async_session
        from app.models.models import LedgerRecord
        from app.services.modules import blackbox_ledger as ledger_mod
        from sqlalchemy import select

        async with async_session() as session:
            rows = (await session.execute(
                select(LedgerRecord).order_by(LedgerRecord.seq).limit(limit)
            )).scalars().all()
        restored = 0
        seen = {r.get("record_id") for r in ledger_mod._ledger}
        for row in rows:
            try:
                record = json.loads(row.record_json or "{}")
            except Exception:
                continue
            if not isinstance(record, dict) or not record.get("record_id"):
                continue
            if record["record_id"] in seen:
                continue
            seen.add(record["record_id"])
            ledger_mod._ledger.append(record)
            ledger_mod._prev_hash = record.get("merkle_hash", ledger_mod._prev_hash)
            restored += 1
        if restored:
            log.info("ledger chain restored: %d records", restored)
        return restored
    except Exception as exc:
        log.warning("ledger restore skipped: %s", str(exc)[:160])
        return 0


async def save_escrow_hold(hold: dict) -> bool:
    """Best-effort upsert of an escrow hold. Never raises."""
    if not DB_CONNECTED or not isinstance(hold, dict) or not hold.get("escrow_id"):
        return False
    try:
        from app.db.session import async_session
        from app.models.models import EscrowHold

        async with async_session() as session:
            existing = await session.get(EscrowHold, hold["escrow_id"])
            if existing:
                existing.status = hold.get("status", existing.status)
                existing.amount = float(hold.get("amount", existing.amount or 0))
            else:
                session.add(EscrowHold(
                    id=hold["escrow_id"],
                    agent_id=str(hold.get("agent_id", "")),
                    amount=float(hold.get("amount", 0)),
                    status=hold.get("status", "held"),
                ))
            await session.commit()
        return True
    except Exception as exc:
        log.warning("escrow persist skipped: %s", str(exc)[:160])
        return False


async def save_contact_submission(submission: dict) -> bool:
    """Best-effort persist of a contact-form submission.

    Returns True when the row is committed. A False return means the
    caller must keep the in-memory copy and tell the operator, because
    mail alone is not a durable record of a lead.
    """
    if not DB_CONNECTED or not isinstance(submission, dict):
        return False
    if not submission.get("ticket") or not submission.get("email"):
        return False
    try:
        from app.db.session import async_session
        from app.models.models import ContactSubmission

        async with async_session() as session:
            session.add(ContactSubmission(
                id=str(submission.get("id") or uuid.uuid4()),
                ticket=str(submission["ticket"]),
                name=str(submission.get("name", ""))[:200],
                email=str(submission["email"])[:320],
                subject=str(submission.get("subject", ""))[:300],
                message=str(submission.get("message", ""))[:10_000],
                source=str(submission.get("source", "landing"))[:80],
                client_ip=str(submission.get("client_ip", ""))[:64],
                user_agent=str(submission.get("user_agent", ""))[:400],
                notified=bool(submission.get("notified", False)),
            ))
            await session.commit()
        return True
    except Exception as exc:
        log.warning("contact persist skipped: %s", str(exc)[:160])
        return False


async def mark_contact_notified(ticket: str) -> bool:
    """Flip the notified flag once the mail provider accepted the message."""
    if not DB_CONNECTED or not ticket:
        return False
    try:
        from sqlalchemy import select
        from app.db.session import async_session
        from app.models.models import ContactSubmission

        async with async_session() as session:
            row = (await session.execute(
                select(ContactSubmission).where(ContactSubmission.ticket == ticket)
            )).scalar_one_or_none()
            if not row:
                return False
            row.notified = True
            await session.commit()
        return True
    except Exception as exc:
        log.warning("contact notify flag skipped: %s", str(exc)[:160])
        return False


async def save_order(order: dict) -> bool:
    """Write a checkout before the buyer leaves for the gateway.

    Without this, a serverless callback can land on an instance that never
    saw the checkout and would report "unknown order".
    """
    if not DB_CONNECTED or not isinstance(order, dict) or not order.get("order_id"):
        return False
    try:
        from app.db.session import async_session
        from app.models.models import Order

        async with async_session() as session:
            row = await session.get(Order, order["order_id"])
            if row is None:
                row = Order(id=order["order_id"])
                session.add(row)
            row.owner = str(order.get("owner", ""))
            row.modules = json.dumps(order.get("modules", []))
            row.subtotal_inr = int(order.get("subtotal_inr", 0))
            row.discount_pct = int(order.get("discount_pct", 0))
            row.discount_inr = int(order.get("discount_inr", 0))
            row.total_inr = int(order.get("total_inr", 0))
            row.status = str(order.get("status", "pending-payment"))
            row.provider = str(order.get("provider", "payu"))
            row.provider_txnid = str(order.get("provider_txnid", ""))
            row.paid_via = str(order.get("paid_via", ""))
            await session.commit()
        return True
    except Exception as exc:
        log.warning("order persist skipped: %s", str(exc)[:160])
        return False


async def load_order(order_id: str) -> dict | None:
    """Read an order back, for a callback that arrived on another instance."""
    if not DB_CONNECTED or not order_id:
        return None
    try:
        from app.db.session import async_session
        from app.models.models import Order

        async with async_session() as session:
            row = await session.get(Order, order_id)
            if row is None:
                return None
            try:
                modules = json.loads(row.modules or "[]")
            except Exception:
                modules = []
            return {
                "order_id": row.id,
                "owner": row.owner,
                "modules": modules if isinstance(modules, list) else [],
                "subtotal_inr": row.subtotal_inr,
                "discount_pct": row.discount_pct,
                "discount_inr": row.discount_inr,
                "total_inr": row.total_inr,
                "status": row.status,
                "provider": row.provider,
                "provider_txnid": row.provider_txnid,
                "paid_via": row.paid_via,
                "created_at": row.created_at.timestamp() if row.created_at else 0,
                "paid_at": row.paid_at.isoformat() if row.paid_at else None,
            }
    except Exception as exc:
        log.warning("order load skipped: %s", str(exc)[:160])
        return None


async def update_order(order: dict) -> bool:
    """Persist a status change (activation, failure)."""
    return await save_order(order)


async def ensure_entitlement_expiry() -> bool:
    """Add the paid-through column to an existing entitlements table.

    `create_all` cannot add columns. Idempotent, and safe to run on every
    boot: `IF NOT EXISTS` is a no-op once applied.
    """
    if not DB_CONNECTED:
        return False
    try:
        from app.db.session import engine
        from sqlalchemy import text

        async with engine.begin() as conn:
            await conn.execute(text(
                "ALTER TABLE entitlements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_entitlements_expires_at ON entitlements (expires_at)"
            ))
        return True
    except Exception as exc:
        log.warning("entitlement expiry migration skipped: %s", str(exc)[:160])
        return False


async def grant_entitlements(
    owner: str, product_ids: list[str], order_id: str, period_days: int = 30
) -> bool:
    """Record purchased modules durably, extending an existing expiry.

    A renewal is a new order: the paid-through date moves forward by one
    period from the later of now and the current expiry. Replaying the same
    order is ignored by the caller (`mark_paid` is idempotent), so a
    duplicated gateway callback cannot buy a free month.
    """
    if not DB_CONNECTED or not owner or not product_ids:
        return False
    try:
        from datetime import datetime, timedelta, timezone
        from app.db.session import async_session
        from app.models.models import Entitlement

        now = datetime.now(timezone.utc)
        extension = timedelta(days=period_days)
        async with async_session() as session:
            for product_id in product_ids:
                row = await session.get(Entitlement, (owner, product_id))
                if row is None:
                    session.add(Entitlement(
                        owner=owner,
                        product_id=product_id,
                        order_id=order_id,
                        expires_at=now + extension,
                    ))
                else:
                    if row.order_id == order_id:
                        # Replayed callback for an order already applied.
                        continue
                    base = row.expires_at
                    if base is not None and base.tzinfo is None:
                        base = base.replace(tzinfo=timezone.utc)
                    start = base if base and base > now else now
                    row.expires_at = start + extension
                    row.order_id = order_id
            await session.commit()
        return True
    except Exception as exc:
        log.warning("entitlement persist skipped: %s", str(exc)[:160])
        return False


async def restore_entitlements() -> int:
    """Load purchased modules into the in-process cache on boot.

    Rows created before expiry existed get one 30-day grace period, written
    back so the next boot is deterministic. Expired rows are skipped: an
    unpaid month must not silently keep working after a restart.
    """
    if not DB_CONNECTED:
        return 0
    try:
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import select
        from app.db.session import async_session
        from app.models.models import Entitlement
        from app.services import billing

        now = datetime.now(timezone.utc)
        changed = False
        loaded = 0
        async with async_session() as session:
            rows = (await session.execute(select(Entitlement))).scalars().all()
            for row in rows:
                expires = row.expires_at
                if expires is not None and expires.tzinfo is None:
                    expires = expires.replace(tzinfo=timezone.utc)
                if expires is None:
                    # Grandfather pre-expiry purchases for one period.
                    expires = now + timedelta(days=billing.PERIOD_DAYS)
                    row.expires_at = expires
                    changed = True
                if expires <= now:
                    continue
                billing._entitlements.setdefault(row.owner, {})[row.product_id] = (
                    expires.timestamp()
                )
                loaded += 1
            if changed:
                await session.commit()
        return loaded
    except Exception as exc:
        log.warning("entitlement restore skipped: %s", str(exc)[:160])
        return 0


async def db_health() -> dict:
    """Cheap liveness probe for the health endpoint.

    Runs one trivial statement so a pooler that accepts connections but
    has lost its backend is still reported as unhealthy. Never raises.
    """
    if not DB_CONNECTED:
        return {"connected": False, "latency_ms": None}
    try:
        import time
        from sqlalchemy import text
        from app.db.session import async_session

        started = time.perf_counter()
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {
            "connected": True,
            "latency_ms": round((time.perf_counter() - started) * 1000, 1),
        }
    except Exception as exc:
        log.warning("db health check failed: %s", str(exc)[:160])
        return {"connected": False, "latency_ms": None}


async def ledger_health() -> dict:
    """Head of the ledger chain and record count, for uptime monitoring."""
    try:
        from sqlalchemy import func, select
        from app.db.session import async_session
        from app.models.models import LedgerRecord

        if not DB_CONNECTED:
            from app.services.modules import blackbox_ledger as ledger_mod
            chain = ledger_mod._ledger  # memory mode: report what we hold
            return {"stored": len(chain), "head": chain[-1]["merkle_hash"] if chain else None}

        async with async_session() as session:
            total = (await session.execute(
                select(func.count()).select_from(LedgerRecord)
            )).scalar() or 0
            head = (await session.execute(
                select(LedgerRecord.merkle_hash).order_by(LedgerRecord.seq.desc()).limit(1)
            )).scalar_one_or_none()
        return {"stored": int(total), "head": head}
    except Exception as exc:
        log.warning("ledger health check failed: %s", str(exc)[:160])
        return {"stored": None, "head": None}


async def load_escrow_hold(escrow_id: str) -> dict | None:
    """Fetch a hold from Postgres into memory (cross-restart verify)."""
    if not DB_CONNECTED or not escrow_id:
        return None
    try:
        from app.db.session import async_session
        from app.models.models import EscrowHold
        from app.services.modules import blackbox_ledger as ledger_mod

        async with async_session() as session:
            row = await session.get(EscrowHold, escrow_id)
            if not row:
                return None
            hold = {
                "escrow_id": row.id,
                "status": row.status,
                "amount": row.amount,
                "agent_id": row.agent_id,
                "oracle_id": "",
                "criteria": {},
                "created_at": row.created_at.isoformat() if row.created_at else "",
                "decided_at": row.decided_at.isoformat() if row.decided_at else None,
            }
            ledger_mod.escrow_put_hold(hold)
            return hold
    except Exception as exc:
        log.warning("escrow load skipped: %s", str(exc)[:160])
        return None


async def upsert_user(identity: dict) -> dict | None:
    """Sync an authenticated identity into the users table (Clerk -> DB).

    First sighting creates the row, later calls refresh the mutable fields.
    Best-effort: a DB failure never breaks the request. Returns the row dict.
    """
    if not DB_CONNECTED or not isinstance(identity, dict):
        return None
    clerk_id = str(identity.get("id") or identity.get("sub") or identity.get("user_id") or "").strip()
    if not clerk_id:
        return None
    email = identity.get("email") or identity.get("primary_email_address") or ""
    full_name = (
        identity.get("name")
        or identity.get("full_name")
        or " ".join(p for p in [identity.get("first_name"), identity.get("last_name")] if p)
        or ""
    )
    org_id = identity.get("organization_id") or identity.get("org_id")
    try:
        from app.db.session import async_session
        from app.models.models import User
        from sqlalchemy import select

        async with async_session() as session:
            row = (await session.execute(
                select(User).where(User.clerk_id == clerk_id)
            )).scalars().first()
            if row is None:
                row = User(clerk_id=clerk_id)
                session.add(row)
            if email:
                row.email = email
            if full_name:
                row.full_name = full_name
            if org_id:
                row.organization_id = str(org_id)
            row.is_active = True
            await session.commit()
            await session.refresh(row)
            return {
                "id": row.id,
                "clerk_id": row.clerk_id,
                "email": row.email,
                "full_name": row.full_name,
                "organization_id": row.organization_id,
                "is_active": row.is_active,
            }
    except Exception as exc:
        log.warning("user persist skipped: %s", str(exc)[:160])
        return None
    if not DB_CONNECTED or not escrow_id:
        return None
    try:
        from app.db.session import async_session
        from app.models.models import EscrowHold
        from app.services.modules import blackbox_ledger as ledger_mod

        async with async_session() as session:
            row = await session.get(EscrowHold, escrow_id)
            if not row:
                return None
            hold = {
                "escrow_id": row.id,
                "status": row.status,
                "amount": row.amount,
                "agent_id": row.agent_id,
                "oracle_id": "",
                "criteria": {},
                "created_at": row.created_at.isoformat() if row.created_at else "",
                "decided_at": row.decided_at.isoformat() if row.decided_at else None,
            }
            ledger_mod.escrow_put_hold(hold)
            return hold
    except Exception as exc:
        log.warning("escrow load skipped: %s", str(exc)[:160])
        return None
