"""Database bootstrap + best-effort persistence.

Postgres is optional: local dev runs memory-first and every helper below
degrades to a no-op when the database is unreachable. The moment
DATABASE_URL points at a live server (e.g. Neon at deploy), tables are
created on boot and ledger records dual-write automatically.
"""
import json
import logging

log = logging.getLogger("intellirity.db")

DB_CONNECTED = False


async def init_db() -> bool:
    """Create tables if Postgres is reachable. Never crashes boot."""
    global DB_CONNECTED
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
