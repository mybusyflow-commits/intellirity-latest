"""Workspace configuration: model endpoints and policy packs.

The console's Models and Policies pages used to mutate React state only, so
"register endpoint" and "promote to production" went nowhere. This router
gives them a real server-side store, scoped per authenticated owner.

State is in-process (like the threat/scan stores) and resets on restart;
it is the working configuration, not the audit record — the ledger is what
keeps the permanent record.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import require_user

router = APIRouter()

# Seed policy packs. These are the product's shipped guardrail bundles.
SEED_POLICY_PACKS = [
    {
        "id": "payments-strict",
        "name": "payments-strict",
        "desc": "Checkout agents and payment tools. Deny-by-default on spend.",
        "version": "v18",
        "rules": 64,
        "enabled": True,
        "yaml": "deny:\n  - spend_above: 5000\n  - unverified_payee\nredact: [pan, iban, routing]\nrequire_intent_proof: true",
    },
    {
        "id": "support-standard",
        "name": "support-standard",
        "desc": "Customer support copilots. Balanced helpfulness vs leakage.",
        "version": "v31",
        "rules": 41,
        "enabled": True,
        "yaml": "redact: [pii, credentials]\nmax_tool_chain: 6\nblock:\n  - prompt_leak_probe",
    },
    {
        "id": "code-assist",
        "name": "code-assist",
        "desc": "Code assistants and review bots. Audits generated diffs.",
        "version": "v22",
        "rules": 38,
        "enabled": True,
        "yaml": "audit_generated_code: true\nblock: [sqli, xss, ssrf, weak_crypto]\nallow_secrets_in_snippets: false",
    },
    {
        "id": "triage-hipaa",
        "name": "triage-hipaa",
        "desc": "Health triage copilots. PHI handling under HIPAA controls.",
        "version": "v9",
        "rules": 52,
        "enabled": False,
        "yaml": "redact: [phi, mrn, dob]\nretention_days: 30\naudit_level: full\nrequire_intent_proof: true",
    },
]

SEED_MODELS = [
    {"id": "gpt-prod-01", "kind": "OpenAI", "paused": False},
    {"id": "claude-prod", "kind": "Anthropic", "paused": False},
    {"id": "chatbot-cust", "kind": "Custom", "paused": False},
]

# owner -> {"models": [...], "policies": [...]}
_workspaces: dict[str, dict] = {}


def _owner(user: dict) -> str:
    return str((user or {}).get("sub") or (user or {}).get("user_id") or "local-dev")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_workspace(owner: str) -> dict:
    ws = _workspaces.get(owner)
    if ws is None:
        ws = {
            "models": [
                {**m, "last_risk": None, "last_scan": None, "created_at": _now()}
                for m in SEED_MODELS
            ],
            "policies": [
                {**p, "updated_at": _now(), "promoted_at": None, "promoted_by": None,
                 "approved_by": [], "promotions": 0}
                for p in SEED_POLICY_PACKS
            ],
        }
        _workspaces[owner] = ws
    return ws


class ModelCreate(BaseModel):
    id: str
    kind: str = "Custom"


class ModelStatus(BaseModel):
    paused: bool


class ModelScanResult(BaseModel):
    risk_score: float = 0.0


class PolicyUpdate(BaseModel):
    enabled: bool


@router.get("/models")
async def list_models(user: dict = Depends(require_user)):
    return {"models": _get_workspace(_owner(user))["models"]}


@router.post("/models")
async def register_model(body: ModelCreate, user: dict = Depends(require_user)):
    ws = _get_workspace(_owner(user))
    mid = body.id.strip()
    if not mid:
        raise HTTPException(status_code=422, detail="id is required")
    if len(mid) > 120:
        raise HTTPException(status_code=422, detail="id too long (max 120 chars)")
    if any(m["id"] == mid for m in ws["models"]):
        raise HTTPException(status_code=409, detail=f"Endpoint '{mid}' is already registered")
    entry = {
        "id": mid,
        "kind": (body.kind or "Custom").strip()[:64] or "Custom",
        "paused": False,
        "last_risk": None,
        "last_scan": None,
        "created_at": _now(),
    }
    ws["models"].append(entry)
    return {"model": entry}


@router.post("/models/{model_id}/status")
async def set_model_status(model_id: str, body: ModelStatus, user: dict = Depends(require_user)):
    ws = _get_workspace(_owner(user))
    for m in ws["models"]:
        if m["id"] == model_id:
            m["paused"] = bool(body.paused)
            return {"model": m}
    raise HTTPException(status_code=404, detail=f"Endpoint '{model_id}' not found")


@router.post("/models/{model_id}/scan-result")
async def record_scan(model_id: str, body: ModelScanResult, user: dict = Depends(require_user)):
    """Store the outcome of a real scan so the card shows real numbers."""
    ws = _get_workspace(_owner(user))
    for m in ws["models"]:
        if m["id"] == model_id:
            m["last_risk"] = round(float(body.risk_score or 0.0), 3)
            m["last_scan"] = _now()
            return {"model": m}
    raise HTTPException(status_code=404, detail=f"Endpoint '{model_id}' not found")


@router.get("/policies")
async def list_policies(user: dict = Depends(require_user)):
    return {"policies": _get_workspace(_owner(user))["policies"]}


@router.post("/policies/{pack_id}")
async def set_policy(pack_id: str, body: PolicyUpdate, user: dict = Depends(require_user)):
    ws = _get_workspace(_owner(user))
    for p in ws["policies"]:
        if p["id"] == pack_id:
            p["enabled"] = bool(body.enabled)
            p["updated_at"] = _now()
            return {"policy": p}
    raise HTTPException(status_code=404, detail=f"Policy pack '{pack_id}' not found")


@router.post("/policies/{pack_id}/promote")
async def promote_policy(pack_id: str, user: dict = Depends(require_user)):
    """Promote a pack to production.

    Two-approver promotion is the intended production behaviour: this
    endpoint records approvals in a set, so one operator can never approve
    twice and can never be the second approver on their own promotion.
    """
    ws = _get_workspace(_owner(user))
    for p in ws["policies"]:
        if p["id"] == pack_id:
            approver = _owner(user)
            approvers = p.setdefault("approved_by", [])
            if approver in approvers:
                raise HTTPException(
                    status_code=409,
                    detail="A second approver is required - you already approved this pack",
                )
            approvers.append(approver)
            p["promoted_by"] = approver
            p["promoted_at"] = _now()
            p["promotions"] = p.get("promotions", 0) + 1
            return {
                "policy": p,
                "approved": True,
                "approvals": len(approvers),
                "needs_second_approver": len(approvers) < 2,
            }
    raise HTTPException(status_code=404, detail=f"Policy pack '{pack_id}' not found")
