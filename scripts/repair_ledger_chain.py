"""Repair the black-box ledger chain.

The chain is a single linear sequence. Before the ledger became
database-authoritative, two processes could append at the same moment and
each commit to its own in-memory tail, which forked the chain at that
point. The records themselves were never altered — only their links were
wrong — so the chain can be re-linked in sequence order.

Run this once against a database that was written by the old code:

    python scripts/repair_ledger_chain.py

It re-seals every record in sequence order, so each one commits to the
record before it. New appends are serialized with an advisory lock, so
this cannot happen again.
"""
import asyncio
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))
os.chdir(os.path.join(ROOT, "backend"))

from app.db.persist import init_db, is_connected  # noqa: E402


async def main() -> int:
    await init_db()
    if not is_connected():
        print("database unavailable — nothing to repair")
        return 1

    from app.db.session import async_session
    from app.models.models import LedgerRecord
    from app.services.modules import blackbox_ledger as ledger_mod
    from sqlalchemy import select

    async with async_session() as session:
        rows = (await session.execute(
            select(LedgerRecord).order_by(LedgerRecord.seq)
        )).scalars().all()

        if not rows:
            print("ledger is empty — nothing to repair")
            return 0

        prev = "0" * 64
        repaired = 0
        for row in rows:
            try:
                record = json.loads(row.record_json or "{}")
            except Exception:
                record = {}
            if not isinstance(record, dict):
                record = {}
            if record.get("previous_hash") == prev and record.get("merkle_hash"):
                prev = record["merkle_hash"]
                continue
            record["previous_hash"] = prev
            record = ledger_mod.seal(record)
            prev = record["merkle_hash"]
            row.previous_hash = record["previous_hash"]
            row.merkle_hash = record["merkle_hash"]
            row.record_json = json.dumps(record, default=str)
            repaired += 1

        await session.commit()

    print(f"repaired {repaired} of {len(rows)} records")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
