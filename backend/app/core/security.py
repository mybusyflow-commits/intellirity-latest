import base64
import hashlib
import hmac
import json
import time
import urllib.request
from typing import Optional

from fastapi import Depends, Header, HTTPException

from app.core.config import settings

# Cache: JWKS url -> (fetched_at, {kid: {"n": int, "e": int}})
_jwks_cache: dict[str, tuple[float, dict]] = {}
_JWKS_TTL = 3600

_SHA256_DER_PREFIX = bytes.fromhex("3031300d060960864801650304020105000420")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _b64url_to_int(data: str) -> int:
    return int.from_bytes(_b64url_decode(data), "big")


def _verify_rs256(signing_input: bytes, signature: bytes, n: int, e: int) -> bool:
    """RSA PKCS#1 v1.5 + SHA-256 check using stdlib only (pow for mod-exp)."""
    k = (n.bit_length() + 7) // 8
    if len(signature) != k:
        return False
    em = pow(int.from_bytes(signature, "big"), e, n).to_bytes(k, "big")
    if len(em) < 2 or em[0] != 0 or em[1] != 1:
        return False
    try:
        sep = em.index(b"\x00", 2)
    except ValueError:
        return False
    if any(b != 0xFF for b in em[2:sep]):
        return False
    digest = hashlib.sha256(signing_input).digest()
    return hmac.compare_digest(em[sep + 1:], _SHA256_DER_PREFIX + digest)


def _get_jwks(jwks_url: str) -> dict:
    now = time.time()
    cached = _jwks_cache.get(jwks_url)
    if cached and now - cached[0] < _JWKS_TTL:
        return cached[1]
    req = urllib.request.Request(jwks_url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        doc = json.loads(r.read().decode())
    keys = {}
    for jwk in doc.get("keys", []):
        if jwk.get("kty") == "RSA" and jwk.get("kid") and jwk.get("n") and jwk.get("e"):
            keys[jwk["kid"]] = {
                "n": _b64url_to_int(jwk["n"]),
                "e": _b64url_to_int(jwk["e"]),
            }
    _jwks_cache[jwks_url] = (now, keys)
    return keys


def _check_times(payload: dict) -> None:
    now = int(time.time())
    if "exp" in payload and payload["exp"] < now:
        raise HTTPException(status_code=401, detail="Session expired")
    if "nbf" in payload and payload["nbf"] > now + 5:
        raise HTTPException(status_code=401, detail="Session not valid yet")


def verify_clerk_token(token: str, secret: str) -> dict:
    """Verify a Clerk session JWT.

    Supports RS256 (production Clerk sessions, verified against the issuer's
    JWKS — issuer allow-listed to https only) with HS256 fallback (secret-key
    signed tokens).
    """
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        header = json.loads(_b64url_decode(header_b64))
        payload = json.loads(_b64url_decode(payload_b64))
    except ValueError:
        raise HTTPException(status_code=401, detail="Malformed session token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session payload")

    alg = str(header.get("alg", "")).upper()
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    try:
        signature = _b64url_decode(sig_b64)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session signature")

    if alg == "RS256":
        issuer = str(payload.get("iss", ""))
        kid = str(header.get("kid", ""))
        if not issuer.startswith("https://") or not kid:
            raise HTTPException(status_code=401, detail="Untrusted token issuer")
        try:
            keys = _get_jwks(issuer.rstrip("/") + "/.well-known/jwks.json")
        except Exception:
            raise HTTPException(status_code=401, detail="Could not fetch signing keys")
        key = keys.get(kid)
        if not key or not _verify_rs256(signing_input, signature, key["n"], key["e"]):
            raise HTTPException(status_code=401, detail="Invalid session signature")
    else:
        expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=401, detail="Invalid session signature")

    _check_times(payload)
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
