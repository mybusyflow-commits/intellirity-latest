#!/usr/bin/env python3
"""Database housekeeping: report size, then vacuum and analyze.

Two jobs, both safe to run on a schedule:

* **Report** -- row counts and on-disk size per table. The ledger is the
  table that grows forever; knowing its size before it surprises you is
  the point.
* **Vacuum** -- reclaim space from dead tuples and refresh planner
  statistics. Postgres autovacuums, but a bulk import or a big delete is
  exactly when an explicit pass helps.

This is the equivalent of "clean up the database" on a WordPress site:
there are no post revisions to delete, so the useful work is compaction
and measurement.

Usage
-----
    python scripts/db_maintenance.py            # report + vacuum
    python scripts/db_maintenance.py --report   # report only
    python scripts/db_maintenance.py --json

Exit codes: 0 ok, 2 database unavailable.
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

TABLES = (
    "users",
    "organizations",
    "security_scans",
    "ledger_records",
    "escrow_holds",
    "threat_detections",
    "contact_submissions",
)


async def run(vacuum: bool) -> tuple[int, dict]:
    from app.db.persist import init_db, is_connected

    await init_db()
    if not is_connected():
        return 2, {"ok": False, "error": "database unavailable"}

    from sqlalchemy import text
    from app.db.session import engine

    report: dict = {"ok": True, "vacuumed": False, "tables": {}}

    async with engine.connect() as conn:
        # VACUUM cannot run inside a transaction block. AUTOCOMMIT makes the
        # driver send it as a standalone statement.
        conn = await conn.execution_options(isolation_level="AUTOCOMMIT")

        if vacuum:
            for table in TABLES:
                try:
                    await conn.execute(text(f'VACUUM (ANALYZE) "{table}"'))
                except Exception as exc:
                    # A missing table (older schema) is not a failure.
                    report.setdefault("skipped", []).append(
                        {"table": table, "reason": str(exc)[:120]}
                    )
            report["vacuumed"] = True

        for table in TABLES:
            try:
                size = (await conn.execute(
                    text("SELECT pg_total_relation_size(:t)"),
                    {"t": table},
                )).scalar()
                rows = (await conn.execute(
                    text(f'SELECT count(*) FROM "{table}"')
                )).scalar()
                report["tables"][table] = {
                    "rows": int(rows or 0),
                    "bytes": int(size or 0),
                }
            except Exception:
                report["tables"][table] = {"rows": None, "bytes": None}

    total = sum(v["bytes"] or 0 for v in report["tables"].values())
    report["total_bytes"] = total
    return 0, report


def _human(n: int | None) -> str:
    if n is None:
        return "-"
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Intellirity database housekeeping.")
    parser.add_argument("--report", action="store_true", help="report only, do not vacuum")
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    args = parser.parse_args(argv)

    code, report = asyncio.run(run(vacuum=not args.report))

    if args.json:
        print(json.dumps(report, indent=2))
        return code
    if code == 2:
        print("error: database unavailable", file=sys.stderr)
        return code

    print(f"vacuum: {'done' if report['vacuumed'] else 'skipped (report only)'}")
    print(f"{'table':<24}{'rows':>12}{'size':>12}")
    for name, info in report["tables"].items():
        rows = "-" if info["rows"] is None else f"{info['rows']:,}"
        print(f"{name:<24}{rows:>12}{_human(info['bytes']):>12}")
    print(f"{'total':<24}{'':>12}{_human(report['total_bytes']):>12}")
    for skip in report.get("skipped", []):
        print(f"note: skipped {skip['table']}: {skip['reason']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
