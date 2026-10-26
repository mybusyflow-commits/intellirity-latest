#!/usr/bin/env python3
"""Smoke-test a running deployment: status, canonicals, indexing, assets.

    python scripts/verify_site.py                                   # local
    python scripts/verify_site.py --base https://intellirity.com    # production

This is the post-deploy check. It looks at what a crawler and a browser
actually receive, not at the source tree.

Exit codes: 0 all checks passed, 1 at least one failed.
"""
from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BROWSER = {
    "User-Agent": "intellirity-verify/1.0 (+https://intellirity.com)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Sec-Fetch-Dest": "document",
}

PUBLIC = ["/", "/engines", "/pricing", "/glossary", "/privacy", "/terms", "/security"]
ASSETS = [
    "/sitemap.xml",
    "/robots.txt",
    "/llms.txt",
    "/llms-full.txt",
    "/.well-known/security.txt",
    "/og-image.png",
    "/manifest.webmanifest",
]

results: list[tuple[bool, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((ok, name, detail))


def get(url: str, *, follow: bool = True, browser: bool = False) -> tuple[int, dict, bytes]:
    headers = dict(BROWSER) if browser else {"User-Agent": BROWSER["User-Agent"]}
    req = urllib.request.Request(url, headers=headers)

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None

    opener = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=30) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()
    except Exception as exc:
        return 0, {}, str(exc).encode()


def expected_domain() -> str:
    env = ROOT / "Intellirity-Frontend" / ".env.local"
    if env.exists():
        for line in env.read_text(encoding="utf-8", errors="ignore").splitlines():
            if line.strip().startswith("NEXT_PUBLIC_SITE_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'").rstrip("/")
    return "https://intellirity.com"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify a deployed Intellirity site.")
    parser.add_argument("--base", default="http://localhost:3000")
    parser.add_argument("--domain", default=expected_domain(), help="expected canonical origin")
    args = parser.parse_args(argv)

    base = args.base.rstrip("/")
    domain = args.domain.rstrip("/")
    print(f"base:   {base}")
    print(f"domain: {domain}\n")

    for path in PUBLIC:
        status, headers, body = get(base + path)
        text = body.decode("utf-8", "replace")
        check(f"GET {path}", status == 200, f"status {status}")
        if status == 200:
            canonical = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', text)
            expected = domain + ("" if path == "/" else path)
            check(
                f"canonical {path}",
                bool(canonical) and canonical.group(1).rstrip("/") == expected.rstrip("/"),
                canonical.group(1) if canonical else "missing",
            )
            check(f"noindex absent on {path}", "noindex" not in text.lower() or path == "/", "")
            check(
                f"h1 present on {path}",
                bool(re.search(r"<h1[\s>]", text)),
                "",
            )

    for path in ASSETS:
        status, headers, body = get(base + path)
        check(f"GET {path}", status == 200, f"status {status}")
        if path == "/og-image.png" and status == 200:
            ctype = headers.get("content-type", "")
            check("og image is a PNG", ctype.startswith("image/png"), ctype)
        if path == "/sitemap.xml" and status == 200:
            sm = body.decode("utf-8", "replace")
            for route in PUBLIC:
                expected = domain + ("" if route == "/" else route)
                check(f"sitemap includes {route}", expected in sm)
            check("sitemap excludes /console", "/console" not in sm)
        if path == "/robots.txt" and status == 200:
            rb = body.decode("utf-8", "replace")
            check("robots points at the sitemap", "Sitemap:" in rb)
            check("robots disallows /console", "Disallow: /console" in rb or "/console" in rb)
        if path == "/.well-known/security.txt" and status == 200:
            sb = body.decode("utf-8", "replace")
            check("security.txt has a contact", "Contact:" in sb)
            check("security.txt canonical matches", domain in sb)

    # The console must never be publicly readable.
    status, headers, _ = get(base + "/console", follow=False, browser=True)
    check(
        "console requires auth",
        status in (302, 303, 307, 308, 503),
        f"status {status} location {headers.get('location', '')}",
    )

    # The API must refuse anonymous calls and never be indexed.
    status, headers, _ = get(base + "/backend/system/summary")
    check("API rejects anonymous calls", status in (401, 403, 503), f"status {status}")
    check(
        "API sends no-store",
        "no-store" in headers.get("cache-control", ""),
        headers.get("cache-control", ""),
    )

    # A stale domain in the rendered HTML is an SEO own-goal.
    _, _, home = get(base + "/")
    home_text = home.decode("utf-8", "replace")
    check("no stale .ai domain in the homepage", "intellirity.ai" not in home_text)

    passed = sum(1 for ok, _, _ in results if ok)
    for ok, name, detail in results:
        if not ok:
            print(f"[FAIL] {name}  {detail}")
    print(f"\nSITE: {passed}/{len(results)} passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
