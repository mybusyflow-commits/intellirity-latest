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
    return DB_CONNECTED


def is_connected() -> bool:
    return DB_CONNECTED


async def persist_ledger_record(record: dict) -> bool:
    """Best-effort dual-write of a sealed ledger record. Never raises."""
    if not DB_CONNECTED or not isinstance(record, dict):
        return False
    try:
        from app.db.session import async_session
        from app.models.models import LedgerRecord

        async with async_session() as session:
            session.add(LedgerRecord(
                id=str(record.get("record_id", "")),
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
                select(LedgerRecord).order_by(LedgerRecord.timestamp).limit(limit)
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
