from fastapi import APIRouter, Depends, HTTPException
from app.services.feature_registry import FEATURE_REGISTRY, get_customer_features, check_entitlement
from app.api.v1.threats import add_threat_event
from app.core.security import require_user

router = APIRouter()


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


@router.post("/{module_id}/scan")
async def run_module_scan(module_id: str, payload: dict):
    if module_id not in FEATURE_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Module {module_id} not found")

    check_result = check_entitlement(module_id, get_customer_features())
    if not check_result["allowed"]:
        raise HTTPException(status_code=403, detail=check_result["message"])

    module_info = FEATURE_REGISTRY[module_id]
    module_func = module_info["function"]
    
    result = module_func(payload)
    
    # Auto-log threat if high/medium risk score or block verdict
    risk_score = result.get("risk_score", 0.0)
    verdict = result.get("verdict", "allow")
    findings = result.get("findings", [])
    
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

    return {"module_id": module_id, "module_name": module_info["name"], "result": result}

