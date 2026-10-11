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
