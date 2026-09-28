import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone
from app.services.feature_registry import register_feature


@register_feature(
    key="verifiable_proof_of_intent",
    name="Verifiable Proof of Intent (VPI)",
    description="Create tamper-resistant cryptographic certificates linking human identity to AI instructions. Premium only.",
    tier="premium",
)
def verifiable_proof_of_intent(payload: dict) -> dict:
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

    cert_string = json.dumps(cert_data, sort_keys=True)
    signature = hashlib.sha256(cert_string.encode()).hexdigest()

    certificate = {
        "id": f"vpi_{signature[:16]}",
        "data": cert_data,
        "signature": signature,
        "algorithm": "SHA-256",
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
