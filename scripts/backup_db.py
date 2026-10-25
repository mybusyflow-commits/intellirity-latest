#!/usr/bin/env python3
"""Nightly logical backup of the Intellirity database.

Why a script and not just "trust the provider": the ledger is the product's
evidence trail. A managed Postgres gives point-in-time recovery, but only
inside its own retention window and only in its own account. A portable
dump that you can restore anywhere is the difference between an incident
and an outage.

Usage
-----
    python scripts/backup_db.py                     # dump + prune
    python scripts/backup_db.py --out D:/backups    # custom directory
    python scripts/backup_db.py --keep 30           # keep 30 files
    python scripts/backup_db.py --no-prune

Reads DATABASE_URL from the environment, falling back to backend/.env.
Requires `pg_dump` (the PostgreSQL client tools) on PATH -- the same major
version as the server is safest.

Exit codes: 0 ok, 1 usage/configuration, 2 pg_dump failed.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "backups"


def _load_env() -> None:
    env_file = ROOT / "backend" / ".env"
    if not env_file.exists():
        return
    try:
        from dotenv import load_dotenv

        load_dotenv(env_file, override=False)
    except Exception:
        # Minimal fallback parser: KEY=VALUE, ignore comments and blanks.
        for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _libpq_url(url: str) -> str:
    """Turn the SQLAlchemy URL into one pg_dump understands.

    `postgresql+asyncpg://` is a SQLAlchemy dialect prefix, not a libpq
    scheme. Query parameters we strip are the ones SQLAlchemy-specific.
    """
    url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    url = url.replace("postgres+asyncpg://", "postgresql://", 1)
    return url


def _redact(url: str) -> str:
    """Never let a password reach a log line."""
    try:
        from urllib.parse import urlsplit, urlunsplit

        parts = urlsplit(url)
        netloc = parts.netloc
        if "@" in netloc:
            userinfo, host = netloc.rsplit("@", 1)
            user = userinfo.split(":", 1)[0]
            netloc = f"{user}:***@{host}"
        return urlunsplit((parts.scheme, netloc, parts.path, "", ""))
    except Exception:
        return "<unparseable database url>"


def _prune(out_dir: Path, keep: int) -> list[Path]:
    files = sorted(out_dir.glob("intellirity-*.dump"), key=lambda p: p.stat().st_mtime, reverse=True)
    removed = []
    for old in files[keep:]:
        try:
            old.unlink()
            removed.append(old)
        except OSError:
            pass
    return removed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Dump the Intellirity database with pg_dump.")
    parser.add_argument("--out", default=str(DEFAULT_OUT), help="output directory")
    parser.add_argument("--keep", type=int, default=14, help="number of dumps to retain")
    parser.add_argument("--no-prune", action="store_true", help="keep every dump")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)

    _load_env()
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        print("error: DATABASE_URL is not set (environment or backend/.env)", file=sys.stderr)
        return 1
    if database_url.startswith("postgresql+asyncpg://") and "localhost" in database_url:
        # A local dump is fine, but say so: this is not the production data.
        print("note: dumping a localhost database", file=sys.stderr)

    pg_dump = shutil.which("pg_dump")
    if not pg_dump:
        print(
            "error: pg_dump not found on PATH.\n"
            "  Install the PostgreSQL client tools, or run the backup inside the db container:\n"
            "    docker compose exec -T db pg_dump -U <user> -d <db> -Fc > backup.dump",
            file=sys.stderr,
        )
        return 1

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = out_dir / f"intellirity-{stamp}.dump"

    cmd = [
        pg_dump,
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file", str(target),
        _libpq_url(database_url),
    ]
    if not args.quiet:
        print(f"dumping {_redact(database_url)} -> {target}")

    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(f"error: pg_dump failed (exit {proc.returncode})", file=sys.stderr)
        if proc.stderr:
            print(proc.stderr.strip()[:2000], file=sys.stderr)
        # Never leave a truncated dump behind: it looks like a backup and
        # is not one.
        try:
            target.unlink(missing_ok=True)
        except OSError:
            pass
        return 2

    size = target.stat().st_size
    if size == 0:
        print("error: pg_dump produced an empty file", file=sys.stderr)
        target.unlink(missing_ok=True)
        return 2

    if not args.quiet:
        print(f"ok: {target.name} ({size / 1024 / 1024:.1f} MB)")

    if not args.no_prune:
        for old in _prune(out_dir, max(1, args.keep)):
            if not args.quiet:
                print(f"pruned {old.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
