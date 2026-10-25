"""Repair the black-box ledger chain.

The chain is a single linear sequence. Before the ledger became
database-authoritative, two processes could append at the same moment and
each commit to its own in-memory tail, which forked the chain at that
point. The records themselves were never altered — only their links were
wrong — so the chain can be re-linked in sequence order.

    python scripts/repair_ledger_chain.py --dry-run   # report only
    python scripts/repair_ledger_chain.py

What it changes, per record, in sequence order:

* `previous_hash` is set to the previous record's `merkle_hash`;
* the record is re-sealed from its own content, with any stale
  `merkle_hash` removed first. Sealing a dict that still contains its old
  hash produces a hash of the old hash, which looks like tampering to
  anyone who recomputes it later. That mistake is why this script exists
  in its current form.

Nothing else in the payload is touched. If the *content* of a record
changed, this tool will happily re-seal it — which is why
`scripts/verify_ledger.py` distinguishes `broken_link` (safe to repair)
from `content_tampered` (investigate first). Run verify before repairing
in anger.

New appends are serialized with an advisory lock, so the fork cannot
happen again.
"""
import argparse
import asyncio
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))
os.chdir(os.path.join(ROOT, "backend"))

from app.db.persist import init_db, is_connected  # noqa: E402


async def main(dry_run: bool = False) -> int:
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

            # Hash the content, not the content plus its previous hash.
            body = {k: v for k, v in record.items() if k != "merkle_hash"}
            body["previous_hash"] = prev
            resealed = ledger_mod.seal(body)

            if (record.get("previous_hash") == prev
                    and record.get("merkle_hash") == resealed["merkle_hash"]):
                prev = resealed["merkle_hash"]
                continue

            if not dry_run:
                row.previous_hash = resealed["previous_hash"]
                row.merkle_hash = resealed["merkle_hash"]
                row.record_json = json.dumps(resealed, default=str)
            prev = resealed["merkle_hash"]
            repaired += 1

        if not dry_run:
            await session.commit()

    verb = "would repair" if dry_run else "repaired"
    print(f"{verb} {repaired} of {len(rows)} records")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Re-link and re-seal the ledger chain.")
    parser.add_argument("--dry-run", action="store_true", help="report without writing")
    args = parser.parse_args()
    sys.exit(asyncio.run(main(dry_run=args.dry_run)))
