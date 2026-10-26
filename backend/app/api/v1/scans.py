from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_user
from app.core.identity import owner as _billing_owner
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import SecurityScanCreate, SecurityScanResponse
from app.services.feature_registry import FEATURE_REGISTRY
from app.api.v1.threats import add_threat_event

router = APIRouter()

_INITIAL_SCANS = [
    {
        "id": "SCAN-9042",
        "scan_type": "Jailbreak & Injection Sweep",
        "target": "gpt-4-turbo-2024",
        "status": "completed",
        "risk_score": 0.03,
        "created_at": datetime.now(timezone.utc),
        "completed_at": datetime.now(timezone.utc),
        "origin": "sample",
        "findings_count": 0,
    },
    {
        "id": "SCAN-9041",
        "scan_type": "Vibe Code Security Audit",
        "target": "claude-3-opus-20240229",
        "status": "completed",
        "risk_score": 0.12,
        "created_at": datetime.now(timezone.utc),
        "completed_at": datetime.now(timezone.utc),
        "origin": "sample",
        "findings_count": 0,
    },
    {
        "id": "SCAN-9040",
        "scan_type": "Model Supply Chain Verification",
        "target": "llama-3-70b-instruct",
        "status": "completed",
        "risk_score": 0.05,
        "created_at": datetime.now(timezone.utc),
        "completed_at": datetime.now(timezone.utc),
        "origin": "sample",
        "findings_count": 0,
    },
]

_memory_scans: list[dict] = list(_INITIAL_SCANS)

# Monotonic scan counter — ids must never collide between the two write paths.
_scan_seq = 9100


def _next_scan_id() -> str:
    global _scan_seq
    _scan_seq += 1
    return f"SCAN-{_scan_seq}"


def get_scans_store() -> list[dict]:
    return _memory_scans


@router.get("/history", dependencies=[Depends(require_user)])
async def scan_history(limit: Optional[int] = None, cursor: Optional[str] = None):
    """Scan history, newest first. Pass limit for a stable id-cursor page."""
    from app.api.v1.threats import _paginate

    if not limit:
        return {"scans": _memory_scans}
    page = _paginate(_memory_scans, limit, cursor)
    page["items"] = [SecurityScanResponse(**s).model_dump() for s in page["items"]]
    return {"scans": page["items"], "next_cursor": page["next_cursor"], "has_more": page["has_more"]}


@router.post("/code-security")
async def code_security_scan(payload: dict):
    """Run the Vibe Code Security static-analysis engine directly."""
    from app.services.code_analyzer import run_code_scan

    return run_code_scan(
        target_type=payload.get("target_type", "code"),
        target=payload.get("target", ""),
        code=payload.get("code", ""),
    )


@router.post("/", response_model=SecurityScanResponse)
async def create_scan(
    scan: SecurityScanCreate,
    user: dict = Depends(require_user),
):
    """Record a scan by actually running the detectors against the target.

    A scan row that claims a risk score without running an engine is fiction,
    so the score here is computed by the same module set the sweep uses.
    """
    now = datetime.now(timezone.utc)
    sweep = run_full_scan_sync({
        "text": scan.target,
        "target": scan.target,
        "modules": ["jailbreak_injection_protection", "vibe_code_security", "data_loss_prevention"],
    }, owner=_billing_owner(user))
    record = sweep["scan"]
    record.update({
        "id": _next_scan_id(),
        "scan_type": scan.scan_type or "Security Scan",
        "target": scan.target,
        "status": "completed",
        "created_at": now,
        "completed_at": now,
        "origin": "detection",
        "findings_count": sweep.get("total_findings", 0),
    })
    # run_full_scan_sync already inserted a row; replace it with the
    # caller-shaped record rather than keeping two.
    if _memory_scans and _memory_scans[0].get("scan_type") == "Automated Multi-Module Sweep":
        _memory_scans.pop(0)
    _memory_scans.insert(0, record)
    return SecurityScanResponse(**record)


def run_full_scan_sync(payload: dict, owner: str | None = None) -> dict:
    """Synchronous sweep core shared by the live endpoint and background jobs.

    When `owner` is supplied, each requested engine is checked against that
    workspace's plan. Unpaid modules are skipped and reported in
    `denied_modules`; if nothing is allowed the call is a 403. The public
    demo uses a separate free-only path, so this is the enforcement point
    for the console sweep and the job queue.
    """
    from app.api.v1.modules import _reject_oversize

    _reject_oversize(payload)
    text = payload.get("text", "")
    target = payload.get("target", "All AI Models")
    selected_modules = payload.get("modules", ["jailbreak_injection_protection", "vibe_code_security", "data_loss_prevention"])

    denied: dict[str, str] = {}
    if owner is not None:
        from app.services import billing as billing_store

        allowed: list[str] = []
        for module in selected_modules:
            ok, reason = billing_store.engine_allowed(module, owner)
            if ok:
                allowed.append(module)
            else:
                denied[module] = reason
        if not allowed:
            first = next(iter(denied.values()), "No module in this sweep is in your plan.")
            raise HTTPException(status_code=403, detail=first)
        selected_modules = allowed

    now = datetime.now(timezone.utc)
    results = {}
    max_risk = 0.0
    all_findings = []

    # Build a payload every module can use. The code-security module needs a
    # concrete target/code + target_type; otherwise it fabricates an empty-URL
    # scan and always reports a false BLOCK.
    is_url = (target or "").startswith(("http://", "https://"))
    scan_payload = {
        "text": text,
        "direction": "input",
        "target": target if is_url else "",
        "code": text if not is_url else "",
        "target_type": "url" if is_url else "code",
    }

    from app.api.v1.modules import _cached_scan

    import concurrent.futures

    def _run_one(mod_key: str):
        try:
            func = FEATURE_REGISTRY[mod_key]["function"]
            res, was_cached = _cached_scan(mod_key, scan_payload, lambda f=func: f(scan_payload))
            return mod_key, res, was_cached, None
        except Exception as e:
            return mod_key, {"error": str(e)}, True, e

    # N+1-analogue fix: modules are independent pure functions — running them
    # one-by-one in a loop is sequential CPU stall (regex releases the GIL,
    # so threads parallelize for real). Order of results is restored below.
    fresh = False
    runnable = [m for m in selected_modules if m in FEATURE_REGISTRY]
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(len(runnable), 6))) as pool:
        for mod_key, res, was_cached, _err in pool.map(_run_one, runnable):
            results[mod_key] = res
            if not was_cached:
                fresh = True
            risk = res.get("risk_score", 0.0)
            if risk > max_risk:
                max_risk = risk
            if res.get("findings"):
                all_findings.extend(res["findings"])

    # Repeat sweeps reuse cached module results; only a fresh computation
    # (any module newly evaluated) may log a threat — never twice per input.
    status = "completed"
    if max_risk >= 0.7 and fresh:
        # Trigger automatic threat detection event
        add_threat_event(
            threat_type="Adversarial Scan Threat",
            severity="high",
            source=target,
            description=f"High risk score ({max_risk:.2f}) detected during security sweep: {all_findings[:1]}",
        )
    elif max_risk >= 0.3 and fresh:
        add_threat_event(
            threat_type="Suspicious Pattern Detected",
            severity="medium",
            source=target,
            description=f"Medium risk score ({max_risk:.2f}) detected: {all_findings[:1]}",
        )

    scan_record = {
        "id": _next_scan_id(),
        "scan_type": "Automated Multi-Module Sweep",
        "target": target,
        "status": status,
        "risk_score": round(max_risk, 3),
        "created_at": now,
        "completed_at": now,
        "origin": "detection",
        "findings_count": len(all_findings),
    }
    _memory_scans.insert(0, scan_record)

    return {
        "scan": SecurityScanResponse(**scan_record).model_dump(mode="json"),
        "module_results": results,
        "max_risk_score": round(max_risk, 3),
        "total_findings": len(all_findings),
        "denied_modules": denied,
    }


@router.post("/run")
async def run_full_scan(payload: dict, user: dict = Depends(require_user)):
    """Run an automated sweep across multiple security modules (live)."""
    return run_full_scan_sync(payload, owner=_billing_owner(user))


@router.get("/", response_model=list[SecurityScanResponse], dependencies=[Depends(require_user)])
async def list_scans():
    return [SecurityScanResponse(**s) for s in _memory_scans]


@router.get("/{scan_id}", response_model=SecurityScanResponse, dependencies=[Depends(require_user)])
async def get_scan(scan_id: str):
    for s in _memory_scans:
        if s["id"] == scan_id:
            return SecurityScanResponse(**s)
    raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found")

