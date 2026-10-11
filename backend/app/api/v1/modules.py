import hashlib
import json
import time
from fastapi import APIRouter, Depends, HTTPException
from app.services.feature_registry import FEATURE_REGISTRY, get_customer_features, check_entitlement
from app.api.v1.threats import add_threat_event
from app.core.security import require_user

router = APIRouter()

# In-memory TTL cache for PURE detectors (same payload -> same verdict).
# Stateful modules are NEVER cached: ledger/escrow mutate state, VPI mints a
# unique nonce per call. Cache key hashes the full payload, so per-user and
# per-session inputs partition naturally (no shared-key leakage).
_CACHEABLE = {
    "jailbreak_injection_protection": 60,
    "vibe_code_security": 60,
    "data_loss_prevention": 60,
    "content_moderation": 60,
    "advanced_threat_intelligence": 60,
    "ai_action_policy_enforcer": 60,
    "data_flow_tracker": 60,
    "denial_of_wallet_protector": 60,
    "model_supply_chain_security": 300,
    "workflow_anomaly_detector": 60,
    "behavioral_analysis_engine": 60,
    "mcp_security_monitor": 60,
    "threat_intelligence_feed": 300,
}
_scan_cache: dict[str, tuple[float, dict]] = {}
_CACHE_MAX = 512


def _cached_scan(module_id: str, payload: dict, compute):
    ttl = _CACHEABLE.get(module_id)
    if not ttl:
        return compute(), False
    try:
        fingerprint = hashlib.sha256(
            json.dumps({"m": module_id, "p": payload}, sort_keys=True, default=str).encode()
        ).hexdigest()
    except Exception:
        return compute(), False
    now = time.time()
    hit = _scan_cache.get(fingerprint)
    if hit and now - hit[0] < ttl:
        return hit[1], True
    result = compute()
    _scan_cache[fingerprint] = (now, result)
    if len(_scan_cache) > _CACHE_MAX:
        oldest = min(_scan_cache, key=lambda k: _scan_cache[k][0])
        del _scan_cache[oldest]
    return result, False


@router.get("", dependencies=[Depends(require_user)])
@router.get("/", dependencies=[Depends(require_user)])
async def list_modules():
    features = []
    for key, feature in FEATURE_REGISTRY.items():
        features.append({
            "id": key,
            "name": feature["name"],
            "description": feature["description"],
            "tier": feature["tier"],
            "enabled": True,
        })
    return {"modules": features}


@router.get("/{module_id}")
async def get_module(module_id: str):
    if module_id not in FEATURE_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
    feature = FEATURE_REGISTRY[module_id]
    return {
        "id": module_id,
        "name": feature["name"],
        "description": feature["description"],
        "tier": feature["tier"],
        "enabled": True,
    }


# DoS guard: regex-heavy detection must never chew on megabytes in one request.
MAX_SCAN_CHARS = 200_000


def _reject_oversize(payload: dict) -> None:
    for key in ("text", "code", "target", "instruction", "prompt", "action"):
        val = payload.get(key, "")
        if isinstance(val, str) and len(val) > MAX_SCAN_CHARS:
            raise HTTPException(
                status_code=413,
                detail=f"Field '{key}' exceeds {MAX_SCAN_CHARS} characters. Split the input and retry.",
            )


@router.post("/{module_id}/scan")
async def run_module_scan(module_id: str, payload: dict):
    if module_id not in FEATURE_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Module {module_id} not found")
    _reject_oversize(payload)

    check_result = check_entitlement(module_id, get_customer_features())
    if not check_result["allowed"]:
        raise HTTPException(status_code=403, detail=check_result["message"])

    module_info = FEATURE_REGISTRY[module_id]
    module_func = module_info["function"]

    # Malformed payloads must fail as 422, never as a 500: the module gets
    # well-formed-but-unexpected shapes (e.g. a string where a list belongs).
    def _compute():
        try:
            return module_func(payload)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Scan failed: {type(exc).__name__}")

    result, cached = _cached_scan(module_id, payload, _compute)

    # Auto-log threat if high/medium risk score or block verdict.
    # Cache hits never re-log: the event was already recorded on first scan.
    risk_score = result.get("risk_score", 0.0)
    verdict = result.get("verdict", "allow")
    findings = result.get("findings", [])
    _should_log = not cached and (verdict == "block" or risk_score >= 0.6 or verdict == "flag" or risk_score >= 0.3)
    
    # Ledger dual-write: sealed records persist to Postgres when available.
    if module_id == "black_box_ledger" and isinstance(result.get("record"), dict):
        from app.db.persist import persist_ledger_record

        await persist_ledger_record(result["record"])

    if _should_log:
        if verdict == "block" or risk_score >= 0.6:
            add_threat_event(
                threat_type=f"{module_info['name']} Threat",
                severity="high",
                source=payload.get("source", "Model Inference Engine"),
                description=f"BLOCKED attack via {module_info['name']}: {findings[:1] if findings else 'High risk detection'}",
            )
        elif verdict == "flag" or risk_score >= 0.3:
            add_threat_event(
                threat_type=f"{module_info['name']} Anomaly",
                severity="medium",
                source=payload.get("source", "Model Inference Engine"),
                description=f"FLAGGED suspicious activity via {module_info['name']}: {findings[:1] if findings else 'Medium risk detection'}",
            )

    return {"module_id": module_id, "module_name": module_info["name"], "result": result, "cached": cached}

