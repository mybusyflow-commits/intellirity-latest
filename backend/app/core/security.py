import base64
import hashlib
import hmac
import json
import os
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


def clerk_issuer() -> str:
    """The only issuer this deployment will accept session tokens from.

    Delegates to `config.resolve_clerk_issuer` so boot-time validation and
    the request-time verifier cannot disagree.
    """
    from app.core.config import resolve_clerk_issuer

    return resolve_clerk_issuer(settings)


def _authorized_parties() -> list[str]:
    raw = (settings.CLERK_AUTHORIZED_PARTIES or "").strip()
    if not raw:
        return []
    return [p.strip().rstrip("/") for p in raw.split(",") if p.strip()]


def _get_jwks(jwks_url: str) -> dict:
    now = time.time()
    cached = _jwks_cache.get(jwks_url)
    if cached and now - cached[0] < _JWKS_TTL:
        return cached[1]
    # Clerk's custom domain sits behind Cloudflare. A bare urllib request has
    # been observed to get challenged from some egress ranges, which surfaced
    # to the console as "Couldn't fetch signing keys". Identify the client,
    # retry once, and only then fail.
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            req = urllib.request.Request(
                jwks_url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "Intellirity/1.0 (+https://intellirity.com)",
                },
            )
            with urllib.request.urlopen(req, timeout=8) as r:
                doc = json.loads(r.read().decode())
            keys = {}
            for jwk in doc.get("keys", []):
                if jwk.get("kty") == "RSA" and jwk.get("kid") and jwk.get("n") and jwk.get("e"):
                    keys[jwk["kid"]] = {
                        "n": _b64url_to_int(jwk["n"]),
                        "e": _b64url_to_int(jwk["e"]),
                    }
            if keys:
                _jwks_cache[jwks_url] = (now, keys)
                return keys
            last_error = RuntimeError("JWKS contained no RSA signing keys")
        except Exception as exc:  # network, HTTP status, malformed body
            last_error = exc
        if attempt == 0:
            time.sleep(0.25)
    raise last_error or RuntimeError("JWKS unavailable")


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
        issuer = str(payload.get("iss", "")).rstrip("/")
        kid = str(header.get("kid", ""))
        if not issuer.startswith("https://") or not kid:
            raise HTTPException(status_code=401, detail="Untrusted token issuer")

        # Pin the issuer BEFORE fetching its keys. Taking `iss` from the
        # token and trusting it lets anyone with a domain serve their own
        # JWKS and mint a session; it also turns this endpoint into an SSRF
        # primitive. One configured issuer, one fetch target.
        trusted = clerk_issuer()
        if not trusted:
            if settings.ENVIRONMENT == "production":
                raise HTTPException(
                    status_code=503,
                    detail="CLERK_ISSUER is not configured, so session tokens cannot be trusted",
                )
            # Development without an issuer: the signature still has to
            # verify against the key set at the token's own issuer.
        elif issuer != trusted:
            raise HTTPException(status_code=401, detail="Untrusted token issuer")

        # Optional second pin: the origin the token was minted for. Clerk
        # puts it in `azp`. Cheap to check and it closes cross-app replay.
        parties = _authorized_parties()
        if parties:
            azp = str(payload.get("azp", "")).rstrip("/")
            if azp not in parties:
                raise HTTPException(status_code=401, detail="Token issued for an untrusted origin")

        try:
            keys = _get_jwks(issuer + "/.well-known/jwks.json")
        except Exception:
            # Retryable upstream problem, not an invalid session. A 503 tells
            # the client to try again instead of implying the user is signed
            # out or unpaid.
            raise HTTPException(
                status_code=503,
                detail="Session verification is temporarily unavailable. Retry in a moment.",
            )
        key = keys.get(kid)
        if not key or not _verify_rs256(signing_input, signature, key["n"], key["e"]):
            raise HTTPException(status_code=401, detail="Invalid session signature")
    else:
        expected = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=401, detail="Invalid session signature")

    _check_times(payload)
    return payload


def require_user(
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
) -> dict:
    """
    Enforce a valid identity for protected routes.

    Two identity paths:
      1. `Authorization: Bearer <jwt>` — a Clerk session token (humans).
      2. `X-API-Key: <key>` — a machine key for the SDKs and MCP server.

    When CLERK_SECRET_KEY is not configured the backend runs in open mode
    (development) and both paths are no-ops, so routes stay accessible.
    In production, a missing key configuration is a hard error — the
    service must never silently fall open.
    """
    # 1. Machine key (SDK / MCP / server-to-server).
    if x_api_key:
        identity = verify_api_key(x_api_key)
        if identity is not None:
            return identity
        # A key was presented but is not valid. Reject it even in open
        # mode: a client with a stale or mistyped key must never silently
        # continue unauthenticated.
        raise HTTPException(status_code=401, detail="Invalid API key")

    # 2. Clerk session token.
    if settings.CLERK_SECRET_KEY:
        if not authorization or not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Missing bearer token")
        token = authorization.split(" ", 1)[1].strip()
        return verify_clerk_token(token, settings.CLERK_SECRET_KEY)

    # 3. Open mode (no auth configured at all).
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=503,
            detail="Authentication is not configured on this deployment",
        )
    if authorization:
        # A token was presented but this deployment cannot validate it
        # (CLERK_SECRET_KEY missing). Silently treating the request as
        # anonymous would hide a broken deployment — fail loudly instead.
        raise HTTPException(
            status_code=503,
            detail="This deployment cannot validate session tokens: CLERK_SECRET_KEY is not set",
        )
    return {}


# ─── Machine API keys ─────────────────────────────────────────────────────────
# Keys are matched by SHA-256 so the stored value is not the secret itself.
#
#   INTELLIRITY_API_KEYS        raw keys, comma separated (dev convenience)
#   INTELLIRITY_API_KEY_HASHES  sha256 hex of each key, comma separated (prod)

def _sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _api_keys_configured() -> bool:
    return bool(_raw_api_keys() or _api_key_hashes())


def _raw_api_keys() -> list[str]:
    raw = os.getenv("INTELLIRITY_API_KEYS", "")
    return [k.strip() for k in raw.split(",") if k.strip()]


def _api_key_hashes() -> list[str]:
    raw = os.getenv("INTELLIRITY_API_KEY_HASHES", "")
    return [h.strip().lower() for h in raw.split(",") if h.strip()]


def verify_api_key(key: str) -> Optional[dict]:
    """Validate an X-API-Key. Returns a machine identity or None.

    The identity is stable per key: `sub` is the key's fingerprint, so
    ownership (orgs, billing, workspace) is consistent across requests
    without ever storing the secret.
    """
    if not key or not isinstance(key, str):
        return None
    key = key.strip()
    if not key:
        return None

    digest = _sha256_hex(key)
    matched = False
    for raw in _raw_api_keys():
        if hmac.compare_digest(_sha256_hex(raw), digest):
            matched = True
            break
    if not matched:
        for h in _api_key_hashes():
            if hmac.compare_digest(h, digest):
                matched = True
                break
    if not matched:
        return None

    fingerprint = digest[:16]
    return {
        "sub": f"apikey:{fingerprint}",
        "api_key_id": fingerprint,
        "auth_mode": "api_key",
        "email": None,
        "name": f"API key {fingerprint[:8]}",
        "role": "service",
    }
