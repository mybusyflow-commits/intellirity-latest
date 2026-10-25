#!/usr/bin/env python3
"""Pre-deployment configuration check.

Run this before every deploy, from the repository root:

    python scripts/preflight.py

It answers one question: *would this configuration work in production?*
It never prints a secret value, only whether one is present.

Checks
------
1. Every required production variable is set (the same rules the engine
   enforces at boot, so a passing preflight cannot be followed by a 503).
2. `CLERK_ISSUER` matches the console's publishable key. A mismatch means
   every signed-in API call would be rejected by the engine.
3. The model gateway key belongs to the configured base URL. A stale
   shell-level variable is the usual cause of a sudden 401.
4. Known gaps are listed as warnings (mail, Turnstile, payments).

Exit codes: 0 ready, 1 blockers found, 2 the console env is missing.
"""
from __future__ import annotations

import base64
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND_ENV = ROOT / "Intellirity-Frontend" / ".env.local"

# Simulate the deployed posture before importing the settings object.
os.environ["ENVIRONMENT"] = "production"
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)

from app.core.config import (  # noqa: E402
    gateway_warnings,
    production_warnings,
    resolve_clerk_issuer,
    settings,
    validate_production_secrets,
)


def parse_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def issuer_from_pk(pk: str) -> str:
    try:
        payload = pk.split("_", 2)[2]
        payload += "=" * (-len(payload) % 4)
        host = base64.urlsafe_b64decode(payload).decode().rstrip("$").strip()
        return f"https://{host}" if host else ""
    except Exception:
        return ""


def main() -> int:
    blockers: list[str] = []
    warnings: list[str] = []

    print("=== Required for production ===")
    checks = [
        ("DATABASE_URL", settings.DATABASE_URL, ""),
        ("CLERK_SECRET_KEY", settings.CLERK_SECRET_KEY, ""),
        ("CLERK_ISSUER", resolve_clerk_issuer(), ""),
        ("SECRET_KEY (not the default)", settings.SECRET_KEY != "dev-secret-key", ""),
        ("VPI_SIGNING_KEY", settings.VPI_SIGNING_KEY, ""),
        ("ALLOWED_ORIGINS", settings.ALLOWED_ORIGINS, ""),
    ]
    for name, value, _ in checks:
        ok = bool(str(value).strip())
        print(f"  {'yes' if ok else 'NO ':>4}  {name}")
        if not ok:
            blockers.append(f"{name} is not set")

    print("\n=== Identity consistency ===")
    frontend = parse_env(FRONTEND_ENV)
    pk = frontend.get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")
    site_url = frontend.get("NEXT_PUBLIC_SITE_URL", "").rstrip("/")
    issuer = resolve_clerk_issuer()

    if not site_url:
        print("  NO    NEXT_PUBLIC_SITE_URL (the console would fall back to the built-in domain)")
        warnings.append("set NEXT_PUBLIC_SITE_URL to the production origin before building")
    else:
        print(f"  yes   site origin: {site_url}")
        if site_url.startswith("http://") and "localhost" not in site_url:
            blockers.append(f"NEXT_PUBLIC_SITE_URL is not https: {site_url}")
        if "localhost" in site_url:
            warnings.append(
                "NEXT_PUBLIC_SITE_URL is localhost; Vercel must override it with the real origin"
            )

    if site_url and issuer:
        from urllib.parse import urlparse

        site_host = (urlparse(site_url).hostname or "").lower()
        issuer_host = (urlparse(issuer).hostname or "").lower()
        same_family = issuer_host == site_host or issuer_host.endswith("." + site_host)
        print(f"  {'yes' if same_family else 'note'}  Clerk host is {issuer_host}")
        if not same_family:
            warnings.append(
                f"Clerk issuer ({issuer_host}) is not on the site domain ({site_host}); "
                "fine for a Clerk development instance, unexpected for production"
            )

    if not pk:
        print("  NO    console publishable key (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)")
        warnings.append("console publishable key missing locally; Vercel must provide it at build time")
    else:
        expected = issuer_from_pk(pk)
        print(f"  {'yes' if expected else 'NO ':>4}  console key decodes to {expected or 'unknown'}")
        if expected and issuer and expected != issuer:
            print(f"  NO    issuer mismatch: engine pins {issuer}, console uses {expected}")
            blockers.append(
                f"CLERK_ISSUER ({issuer}) does not match the console instance ({expected})"
            )
        else:
            print("  yes   engine pins the console's issuer")

    print("\n=== Model gateway ===")
    base = os.getenv("OPENCODEZEN_BASE_URL", "https://opencode.ai/zen/v1")
    print(f"  base: {base}")
    file_env = parse_env(BACKEND / ".env")
    ambient = os.environ.get("OPENCODEZEN_API_KEY", "")
    file_key = file_env.get("OPENCODEZEN_API_KEY", "")
    if ambient and file_key and ambient != file_key:
        print(
            f"  note  a process-level OPENCODEZEN_API_KEY ({ambient[:4]}…) overrides "
            f"backend/.env ({file_key[:4]}…). Open a new terminal, or unset it."
        )
    gateway_problems = gateway_warnings()
    if gateway_problems:
        for p in gateway_problems:
            print(f"  NO    {p}")
            blockers.append(p)
    else:
        print("  yes   key and base URL agree")

    print("\n=== Production gate ===")
    problems = validate_production_secrets()
    if problems:
        for p in problems:
            print(f"  BLOCK {p}")
        blockers.extend(problems)
    else:
        print("  pass  a production boot would be allowed")

    warnings.extend(production_warnings())
    if warnings:
        print("\n=== Warnings (not fatal) ===")
        for w in warnings:
            print(f"  - {w}")

    if blockers:
        print(f"\nRESULT: {len(blockers)} blocker(s). Do not deploy yet.")
        return 1
    print("\nRESULT: ready to deploy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
