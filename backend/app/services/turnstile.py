"""Cloudflare Turnstile spam protection for public forms.

When TURNSTILE_SECRET is unset the check is open (local dev). The moment
the secret exists, every contact submission must carry a valid token.
Test keys (always pass): site 1x00000000000000000000AA,
secret 1x0000000000000000000000000000000-AA.

In production an unconfigured secret is a hard failure: an open contact
form is an unauthenticated spam relay, so we refuse rather than accept.
"""
import os
import urllib.parse
import urllib.request
import json

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
_TEST_SECRET = "1x0000000000000000000000000000000-AA"


def _secret() -> str:
    return os.getenv("TURNSTILE_SECRET", "")


def _is_production() -> bool:
    from app.core.config import settings
    return settings.ENVIRONMENT == "production"


def verify_turnstile(token: str, remote_ip: str = "") -> tuple[bool, str]:
    secret = _secret()
    if not secret:
        if _is_production():
            return False, "spam protection is not configured on this deployment"
        return True, "unconfigured"
    if not token:
        return False, "missing token"
    body = urllib.parse.urlencode(
        {"secret": secret, "response": token, "remoteip": remote_ip}
    ).encode()
    req = urllib.request.Request(
        VERIFY_URL, data=body, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            doc = json.loads(r.read().decode())
    except Exception as exc:
        return False, f"verify request failed: {exc}"
    if doc.get("success"):
        return True, "ok"
    errors = ",".join(doc.get("error-codes", []) or ["unknown"])
    return False, f"rejected: {errors}"
