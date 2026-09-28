import base64
import hashlib
import hmac
import json
import time
from typing import Optional

from fastapi import Depends, Header, HTTPException

from app.core.config import settings


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def verify_clerk_token(token: str, secret: str) -> dict:
    """Verify a Clerk session JWT (HS256, signed with the instance Secret Key)."""
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
    except ValueError:
        raise HTTPException(status_code=401, detail="Malformed session token")

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    try:
        provided = _b64url_decode(sig_b64)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session signature")
    if not hmac.compare_digest(expected, provided):
        raise HTTPException(status_code=401, detail="Invalid session signature")

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session payload")

    now = int(time.time())
    if "exp" in payload and payload["exp"] < now:
        raise HTTPException(status_code=401, detail="Session expired")
    if "nbf" in payload and payload["nbf"] > now + 5:
        raise HTTPException(status_code=401, detail="Session not valid yet")
    return payload


def require_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """
    Dependency that enforces a valid Clerk session for protected routes.

    When CLERK_SECRET_KEY is not configured the backend runs in open mode
    (development), so the dependency is a no-op and routes stay accessible.
    """
    if not settings.CLERK_SECRET_KEY:
        return {}
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    return verify_clerk_token(token, settings.CLERK_SECRET_KEY)
