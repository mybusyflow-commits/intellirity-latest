import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from app.services.feature_registry import register_feature

# Signing key for proof-of-intent certificates. Dedicated key in production;
# falls back to the app secret so the feature is never accidentally unsigned.
def _signing_key() -> bytes:
    from app.core.config import settings
    key = getattr(settings, "VPI_SIGNING_KEY", "") or settings.SECRET_KEY
    return key.encode("utf-8")


def _canonical(cert_data: dict) -> str:
    return json.dumps(cert_data, sort_keys=True, separators=(",", ":"))


@register_feature(
    key="verifiable_proof_of_intent",
    name="Verifiable Proof of Intent (VPI)",
    description="Create tamper-resistant cryptographic certificates linking human identity to AI instructions. Premium only.",
    tier="premium",
)
def verifiable_proof_of_intent(payload: dict) -> dict:
    action = str(payload.get("action", "issue")).lower()

    if action in ("verify", "verify_certificate"):
        return _verify_certificate(payload)

    human_id = payload.get("human_id", "")
    instruction = payload.get("instruction", "")
    action_scope = payload.get("action_scope", [])
    expiry_minutes = payload.get("expiry_minutes", 30)

    if not human_id or not instruction:
        return {"error": "human_id and instruction are required", "certificate": None}

    timestamp = datetime.now(timezone.utc).isoformat()
    expiry = datetime.now(timezone.utc).timestamp() + (expiry_minutes * 60)
    nonce = secrets.token_hex(16)

    cert_data = {
        "human_id": human_id,
        "instruction_hash": hashlib.sha256(instruction.encode()).hexdigest(),
        "action_scope": action_scope,
        "timestamp": timestamp,
        "expiry": expiry,
        "nonce": nonce,
    }

    # Keyed signature (HMAC-SHA256). A certificate can only be produced or
    # accepted by a holder of the server signing key — an attacker cannot
    # mint a valid certificate by hashing the payload themselves.
    signature = hmac.new(_signing_key(), _canonical(cert_data).encode("utf-8"), hashlib.sha256).hexdigest()

    certificate = {
        "id": f"vpi_{signature[:16]}",
        "data": cert_data,
        "signature": signature,
        "algorithm": "HMAC-SHA256",
        "status": "valid",
    }

    proposed = payload.get("proposed_action", "")
    verification = None
    if proposed:
        proposed_hash = hashlib.sha256(proposed.encode()).hexdigest()
        scope_match = any(s.lower() in proposed.lower() for s in action_scope)
        now = datetime.now(timezone.utc).timestamp()
        verification = {
            "proposed_action_hash": proposed_hash,
            "within_scope": scope_match,
            "certificate_valid": now < expiry,
            "approved": scope_match and now < expiry,
        }

    return {
        "certificate": certificate,
        "action_verification": verification,
        "message": "VPI certificate generated successfully.",
    }


def _verify_certificate(payload: dict) -> dict:
    """Verify a certificate's signature and expiry. A forged cert fails."""
    cert = payload.get("certificate") or {}
    cert_data = cert.get("data") or {}
    signature = str(cert.get("signature", ""))

    if not cert_data or not signature:
        return {"error": "certificate.data and certificate.signature are required",
                "verified": False, "valid": False}

    expected = hmac.new(_signing_key(), _canonical(cert_data).encode("utf-8"), hashlib.sha256).hexdigest()
    signature_valid = hmac.compare_digest(expected, signature)

    expiry = cert_data.get("expiry", 0)
    now = datetime.now(timezone.utc).timestamp()
    try:
        not_expired = now < float(expiry)
    except (TypeError, ValueError):
        not_expired = False

    valid = signature_valid and not_expired
    reasons = []
    if not signature_valid:
        reasons.append("signature mismatch - certificate was not issued by this server")
    if not not_expired:
        reasons.append("certificate expired")

    # Optional: confirm the proposed action stays inside the signed scope.
    proposed = payload.get("proposed_action", "")
    scope_match = None
    if proposed:
        scope = cert_data.get("action_scope") or []
        scope_match = any(str(s).lower() in proposed.lower() for s in scope)
        if not scope_match:
            reasons.append("proposed action is outside the certificate scope")

    approved = valid and scope_match is not False

    return {
        "verified": True,
        "valid": approved,
        "signature_valid": signature_valid,
        "expired": not not_expired,
        "within_scope": scope_match,
        "certificate_id": cert.get("id"),
        "reasons": reasons,
        "verdict": "approved" if approved else "denied",
    }
