#!/usr/bin/env python3
"""Verify the black-box ledger from the database, independently of the app.

The chain is only evidence if it can be checked. This script reads the
records in sequence order and proves three things for every row:

1. the stored `previous_hash` is the previous record's `merkle_hash`;
2. the stored `merkle_hash` is what the record's own content hashes to;
3. the denormalised columns agree with the JSON payload.

Exit codes
----------
0  the chain is intact (or empty)
1  the chain is broken -- the output names the first bad record
2  the database is unreachable

Usage
-----
    python scripts/verify_ledger.py
    python scripts/verify_ledger.py --json     # machine-readable summary
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))
os.chdir(os.path.join(ROOT, "backend"))

GENESIS = "0" * 64


def _payload(row) -> dict:
    try:
        record = json.loads(row.record_json or "{}")
    except Exception:
        record = {}
    return record if isinstance(record, dict) else {}


async def verify() -> tuple[int, dict]:
    from app.db.persist import init_db, is_connected

    await init_db()
    if not is_connected():
        return 2, {"ok": False, "error": "database unavailable"}

    from sqlalchemy import select
    from app.db.session import async_session
    from app.models.models import LedgerRecord
    from app.services.modules import blackbox_ledger as ledger_mod

    async with async_session() as session:
        rows = (await session.execute(
            select(LedgerRecord).order_by(LedgerRecord.seq)
        )).scalars().all()

    prev = GENESIS
    problems: list[dict] = []
    for index, row in enumerate(rows):
        record = _payload(row)
        record_id = record.get("record_id") or row.id

        stored_prev = record.get("previous_hash")
        if stored_prev != prev:
            problems.append({
                "index": index,
                "record_id": record_id,
                "seq": row.seq,
                "kind": "broken_link",
                "expected": prev,
                "actual": stored_prev,
            })
            # Continue from the stored link so one fork is reported once
            # rather than cascading through every later record.
            prev = stored_prev or prev
            continue

        body = {k: v for k, v in record.items() if k != "merkle_hash"}
        expected_hash = ledger_mod.seal(body)["merkle_hash"]
        stored_hash = record.get("merkle_hash")
        if stored_hash != expected_hash:
            problems.append({
                "index": index,
                "record_id": record_id,
                "seq": row.seq,
                "kind": "content_tampered",
                "expected": expected_hash,
                "actual": stored_hash,
            })
        elif row.merkle_hash != stored_hash or row.previous_hash != stored_prev:
            problems.append({
                "index": index,
                "record_id": record_id,
                "seq": row.seq,
                "kind": "column_mismatch",
                "expected": stored_hash,
                "actual": row.merkle_hash,
            })
        prev = stored_hash or prev

    summary = {
        "ok": not problems,
        "records": len(rows),
        "problems": len(problems),
        "head": prev if rows else None,
        "first_problems": problems[:10],
    }
    return (0 if not problems else 1), summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify the Intellirity ledger chain.")
    parser.add_argument("--json", action="store_true", help="print only JSON")
    args = parser.parse_args(argv)

    code, summary = asyncio.run(verify())

    if args.json:
        print(json.dumps(summary, indent=2))
    elif code == 2:
        print("error: database unavailable -- cannot verify", file=sys.stderr)
    elif summary["ok"]:
        print(f"ok: {summary['records']} records, chain intact")
        if summary["head"]:
            print(f"head: {summary['head']}")
    else:
        print(
            f"BROKEN: {summary['problems']} problem(s) in {summary['records']} records",
            file=sys.stderr,
        )
        for p in summary["first_problems"]:
            print(
                f"  seq={p['seq']} index={p['index']} {p['kind']} record={p['record_id']}",
                file=sys.stderr,
            )
        print(
            "\nDo not repair blindly. A content_tampered row means the data itself "
            "changed; repair_ledger_chain.py only re-links, and would hide that.",
            file=sys.stderr,
        )
    return code


if __name__ == "__main__":
    raise SystemExit(main())
