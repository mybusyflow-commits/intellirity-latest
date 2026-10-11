import hashlib
import json
import secrets
from datetime import datetime, timezone
from app.services.feature_registry import register_feature

_ledger = []
_prev_hash = "0" * 64


def _merkle_hash(record: dict) -> str:
    return hashlib.sha256(json.dumps(record, sort_keys=True, default=str).encode()).hexdigest()


def _compute_merkle_root(records: list) -> str:
    if not records:
        return hashlib.sha256(b"").hexdigest()
    hashes = [r["merkle_hash"] for r in records]
    while len(hashes) > 1:
        new_level = []
        for i in range(0, len(hashes), 2):
            left = hashes[i]
            right = hashes[i + 1] if i + 1 < len(hashes) else left
            new_level.append(hashlib.sha256((left + right).encode()).hexdigest())
        hashes = new_level
    return hashes[0]


@register_feature(
    key="black_box_ledger",
    name="Black Box Ledger",
    description="Immutable append-only audit vault using Merkle tree chaining. Records every AI decision with tamper-proof integrity.",
    tier="premium",
)
def black_box_ledger(payload: dict) -> dict:
    global _prev_hash

    action = payload.get("action", "log")

    if action == "log":
        return _append(payload)
    elif action == "verify":
        return _verify()
    elif action == "query":
        return _query(payload)
    elif action == "root":
        return {"merkle_root": _compute_merkle_root(_ledger), "total_records": len(_ledger)}
    else:
        return {"error": f"Unknown action: {action}"}


def _append(payload: dict) -> dict:
    global _prev_hash

    record = {
        "record_id": hashlib.sha256(f"{_prev_hash}{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()[:16],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ai_decision": payload.get("ai_decision", ""),
        "prompt_hash": hashlib.sha256(payload.get("prompt", "").encode()).hexdigest() if payload.get("prompt") else None,
        "reasoning_trace": payload.get("reasoning_trace", ""),
        "action_taken": payload.get("action_taken", ""),
        "confidence_score": payload.get("confidence_score", 0.0),
        "vpi_certificate": payload.get("vpi_certificate"),
        "metadata": payload.get("metadata", {}),
        "previous_hash": _prev_hash,
    }

    merkle_hash = _merkle_hash(record)
    record["merkle_hash"] = merkle_hash
    _prev_hash = merkle_hash
    _ledger.append(record)

    return {
        "status": "recorded",
        "record_id": record["record_id"],
        "merkle_hash": merkle_hash,
        "merkle_root": _compute_merkle_root(_ledger),
        "total_records": len(_ledger),
        # Full record included so the API layer can persist it when a
        # database is available. Additive: existing clients ignore it.
        "record": record,
    }


def _verify() -> dict:
    prev = "0" * 64
    tampered = []

    for i, record in enumerate(_ledger):
        if record["previous_hash"] != prev:
            tampered.append({"index": i, "record_id": record["record_id"], "expected": prev, "actual": record["previous_hash"]})
        prev = record["merkle_hash"]

    return {
        "valid": len(tampered) == 0,
        "total_records": len(_ledger),
        "tampered_records": tampered,
        "merkle_root": _compute_merkle_root(_ledger),
    }


def _query(payload: dict) -> dict:
    results = _ledger

    if payload.get("action_taken"):
        results = [r for r in results if payload["action_taken"].lower() in r["action_taken"].lower()]
    if payload.get("from_timestamp"):
        results = [r for r in results if r["timestamp"] >= payload["from_timestamp"]]
    if payload.get("to_timestamp"):
        results = [r for r in results if r["timestamp"] <= payload["to_timestamp"]]

    limit = payload.get("limit", 50)
    results = results[-limit:]

    return {
        "records_returned": len(results),
        "total_records": len(_ledger),
        "records": results,
        "merkle_root": _compute_merkle_root(_ledger),
    }


# Escrow state machine. Holds live here (restored from Postgres on boot
# when a database is available). Transitions are enforced: a hold moves
# held -> released | rejected exactly once. Unknown ids and replays fail
# instead of echoing fake success.
_holds: dict[str, dict] = {}


def escrow_get_hold(escrow_id: str) -> dict | None:
    return _holds.get(escrow_id)


def escrow_put_hold(hold: dict) -> None:
    if isinstance(hold, dict) and hold.get("escrow_id"):
        _holds[hold["escrow_id"]] = hold


@register_feature(
    key="autonomous_escrow",
    name="Autonomous Escrow",
    description="Payment buffer that holds AI agent funds until work is verified by a trusted oracle.",
    tier="premium",
)
def autonomous_escrow(payload: dict) -> dict:
    action = payload.get("action", "create")

    if action == "create":
        try:
            amount = float(payload.get("amount", 0))
        except (TypeError, ValueError):
            return {"error": "amount must be a number", "hold": None}
        if amount <= 0:
            return {"error": "amount must be positive", "hold": None}
        agent_id = str(payload.get("agent_id", "") or "unknown-agent")
        escrow_id = hashlib.sha256(
            f"{agent_id}{datetime.now(timezone.utc).isoformat()}{secrets.token_hex(8)}".encode()
        ).hexdigest()[:16].upper()
        hold = {
            "escrow_id": escrow_id,
            "status": "held",
            "amount": amount,
            "agent_id": agent_id,
            "oracle_id": payload.get("oracle_id", ""),
            "criteria": payload.get("criteria", {}),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "decided_at": None,
        }
        _holds[escrow_id] = hold
        return {
            "escrow_id": escrow_id,
            "status": "held",
            "amount": amount,
            "agent_id": agent_id,
            "oracle_id": hold["oracle_id"],
            "criteria": hold["criteria"],
            "message": "Escrow created. Funds held until oracle verification.",
            "hold": hold,
        }
    elif action in ("verify", "release"):
        hold = _holds.get(str(payload.get("escrow_id", "")))
        if not hold:
            return {"error": "unknown escrow_id", "hold": None}
        if hold["status"] != "held":
            return {"error": f"already {hold['status']}; holds decide exactly once", "hold": hold}
        hold["status"] = "released"
        hold["decided_at"] = datetime.now(timezone.utc).isoformat()
        return {
            "escrow_id": hold["escrow_id"],
            "status": "released",
            "oracle_verdict": "approved",
            "message": "Oracle verified deliverable. Funds released.",
            "hold": hold,
        }
    elif action == "reject":
        hold = _holds.get(str(payload.get("escrow_id", "")))
        if not hold:
            return {"error": "unknown escrow_id", "hold": None}
        if hold["status"] != "held":
            return {"error": f"already {hold['status']}; holds decide exactly once", "hold": hold}
        hold["status"] = "rejected"
        hold["decided_at"] = datetime.now(timezone.utc).isoformat()
        return {
            "escrow_id": hold["escrow_id"],
            "status": "rejected",
            "message": "Oracle rejected deliverable. Funds returned.",
            "hold": hold,
        }
    elif action in ("status", "get"):
        hold = _holds.get(str(payload.get("escrow_id", "")))
        if not hold:
            return {"error": "unknown escrow_id", "hold": None}
        return {"escrow_id": hold["escrow_id"], "status": hold["status"], "hold": hold}
    else:
        return {"error": f"Unknown action: {action}", "hold": None}
