import asyncio
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from app.core.ratelimit import contact_limit
from app.core.security import require_user

from app.api.v1.threats import add_threat_event, get_threats_store
from app.api.v1.scans import get_scans_store

router = APIRouter()

# ─── Live event simulator state ───────────────────────────────────────────────

_LIVE_MODE = True

EVENT_TEMPLATES = [
    {"threat_type": "Prompt Injection Attempt", "severity": "medium", "source": "gpt-4-turbo-2024",
     "description": "Roleplay persona attempting system prompt leak detected on inference endpoint."},
    {"threat_type": "Jailbreak Pattern Detected", "severity": "high", "source": "claude-3-opus-20240229",
     "description": "DAN-style jailbreak prefix matched known adversarial dictionary entry."},
    {"threat_type": "Data Exfiltration Probe", "severity": "high", "source": "llama-3-70b-instruct",
     "description": "Markdown image injection attempting outbound webhook exfiltration."},
    {"threat_type": "Anomalous Output Distribution", "severity": "low", "source": "gemini-1.5-pro-latest",
     "description": "Output entropy deviation beyond 2.4 standard deviations from baseline."},
    {"threat_type": "Rate Limit Anomaly", "severity": "low", "source": "mistral-7b-instruct-v0.2",
     "description": "Token consumption spike from single API client — 8x normal throughput."},
    {"threat_type": "Model Drift Detected", "severity": "medium", "source": "gpt-4-turbo-2024",
     "description": "Perplexity drift across 100 consecutive requests indicates possible fine-tune tampering."},
    {"threat_type": "Unusual Token Sequence", "severity": "low", "source": "claude-3-opus-20240229",
     "description": "Typoglycemia obfuscated token sequence matched known evasion dictionary."},
    {"threat_type": "Tool Misuse Attempt", "severity": "medium", "source": "gpt-4-turbo-2024",
     "description": "AI agent invoked file-system tool outside approved scope — privilege escalation blocked."},
    {"threat_type": "Memory Poisoning Signal", "severity": "high", "source": "llama-3-70b-instruct",
     "description": "Adversarial payload injected into conversation memory to manipulate future outputs."},
    {"threat_type": "Denial-of-Wallet Pattern", "severity": "medium", "source": "gemini-1.5-pro-latest",
     "description": "Recursive prompt loop detected — runaway spend countermeasure engaged."},
]


def generate_live_event() -> dict:
    """Create a demo threat event and add it to the store.

    These are SYNTHETIC (origin="synthetic") — they exist so the console
    shows motion in an empty workspace. They are never counted as real
    detections and are labelled as demo traffic in the API and UI.
    """
    template = random.choice(EVENT_TEMPLATES)
    t = add_threat_event(
        threat_type=template["threat_type"],
        severity=template["severity"],
        source=template["source"],
        description=template["description"],
        origin="synthetic",
    )
    # Cap the store so it never grows without bound (keeps API fast + score healthy)
    store = get_threats_store()
    if len(store) > 200:
        del store[200:]
    return t


async def live_event_loop():
    """Background task: inject a new threat event every few seconds."""
    import logging
    log = logging.getLogger("intellirity.live")
    while True:
        await asyncio.sleep(random.uniform(6, 11))
        if not _LIVE_MODE:
            continue
        try:
            generate_live_event()
        except Exception as exc:
            # One bad event must never kill the loop.
            log.warning("live event failed: %s", exc)
            continue
        # Auto-resolve oldest SYNTHETIC events only. Real detections are
        # resolved by a human through the console — the demo feed must never
        # clear a genuine finding.
        store = get_threats_store()
        active = [t for t in store if not t["is_resolved"] and t.get("origin") == "synthetic"]
        if len(active) > 40:
            to_resolve = active[: max(1, int(len(active) * 0.3))]
            for t in to_resolve:
                t["is_resolved"] = True


# ─── System status ────────────────────────────────────────────────────────────

@router.get("/status")
async def system_status():
    return {
        "backend": "connected",
        "monitoring": "live" if _LIVE_MODE else "paused",
        "demo_feed": bool(_LIVE_MODE),
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health")
async def system_health():
    """Public health probe, reachable through the console's /backend proxy.

    The root /health is only reachable when the API is addressed directly
    (Docker, a sidecar). On Vercel the API is behind a rewrite, so uptime
    monitors need a path inside the API router. Same checks, same status
    codes, and it never requires a session.
    """
    from fastapi.responses import JSONResponse as _JSONResponse
    from app.core.config import settings as _settings
    from app.db import persist
    from app.services.notify import notification_configured

    db = await persist.db_health()
    ledger = await persist.ledger_health()
    healthy = db["connected"] or _settings.ENVIRONMENT != "production"
    body = {
        "status": "healthy" if healthy else "degraded",
        "service": "intellirity",
        "environment": _settings.ENVIRONMENT,
        "database": "connected" if db["connected"] else "memory",
        "database_latency_ms": db["latency_ms"],
        "ledger_records": ledger["stored"],
        "ledger_head": ledger["head"],
        "contact_notifications": "configured" if notification_configured() else "unconfigured",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return _JSONResponse(content=body, status_code=200 if healthy else 503)


# ─── Live summary / KPIs ──────────────────────────────────────────────────────
# Operational data: authenticated only (status + contact stay public).

@router.get("/summary", dependencies=[Depends(require_user)])
async def system_summary():
    threats = get_threats_store()
    scans = get_scans_store()

    # Split the store: real detections vs demo/sample rows. Headline metrics
    # are computed from real detections only so the numbers mean something.
    real = [t for t in threats if t.get("origin", "detection") == "detection"]
    synthetic = [t for t in threats if t.get("origin") == "synthetic"]
    sample = [t for t in threats if t.get("origin") == "sample"]

    active = [t for t in real if not t["is_resolved"]]
    resolved = [t for t in real if t["is_resolved"]]

    # Score derived from the most recent window of REAL threat activity.
    recent = sorted(real, key=lambda t: t["created_at"], reverse=True)[:30]
    recent_high = sum(1 for t in recent if t["severity"] == "high")
    recent_medium = sum(1 for t in recent if t["severity"] == "medium")
    recent_low = sum(1 for t in recent if t["severity"] == "low")

    raw_score = 100.0 - (recent_high * 1.5) - (recent_medium * 0.5) - (recent_low * 0.2)
    score = round(max(0.0, min(100.0, raw_score)), 1)

    real_scans = [s for s in scans if s.get("origin", "detection") == "detection"]
    risk_scores = [s.get("risk_score", 0.0) for s in real_scans if s.get("risk_score") is not None]
    avg_risk = round(sum(risk_scores) / len(risk_scores), 3) if risk_scores else 0.0

    # Models actually monitored = distinct model sources seen in real detections.
    models_monitored = len({t.get("source") for t in real if t.get("source")})

    compliance_score = round(max(0.0, min(100.0, score - 2.0)), 1)

    return {
        "security_score": score,
        "threats_blocked": len(resolved),
        "threats_active": len(active),
        "threats_high": sum(1 for t in active if t["severity"] == "high"),
        "models_monitored": models_monitored,
        "compliance_score": compliance_score,
        "total_scans": len(real_scans),
        "average_risk_score": avg_risk,
        "synthetic_threats": len(synthetic),
        "sample_threats": len(sample),
        "demo_feed": bool(synthetic),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─── Contact form ─────────────────────────────────────────────────────────────

class ContactMessage(BaseModel):
    name: str
    email: str
    subject: str = ""
    message: str
    turnstile_token: str = ""


# Bounded fallback buffer. Rows are also written to Postgres; this list is
# only what the process can still show if the database is unreachable, and
# it must never grow without bound.
_contact_store: list[dict] = []
_CONTACT_BUFFER = 500


def _new_ticket() -> str:
    """Human-readable, collision-resistant ticket id.

    Date prefix makes triage easy; six base-36 characters from a CSPRNG
    make collisions negligible without a database round-trip.
    """
    import secrets

    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"INT-{datetime.now(timezone.utc):%Y%m%d}-{suffix}"


@router.post("/contact", dependencies=[Depends(contact_limit)])
async def contact(msg: ContactMessage, request: Request):
    from fastapi import HTTPException
    from app.services.turnstile import verify_turnstile
    from app.db import persist
    from app.services.notify import send_contact_email

    client_ip = request.client.host if request.client else ""
    ok, reason = verify_turnstile(msg.turnstile_token, client_ip)
    if not ok:
        raise HTTPException(status_code=403, detail=f"Spam check failed: {reason}")
    # Size caps: the input is persisted and mailed, so an unbounded body is
    # both a storage and a delivery vector.
    name, email = msg.name.strip(), msg.email.strip()
    if len(name) > 200 or len(email) > 320 or len(msg.subject) > 300:
        raise HTTPException(status_code=422, detail="Name/email/subject too long")
    if len(msg.message) > 10_000:
        raise HTTPException(status_code=422, detail="Message too long (max 10,000 chars)")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="A valid email address is required")

    ticket = _new_ticket()
    submission = {
        "ticket": ticket,
        "name": name,
        "email": email,
        "subject": msg.subject.strip() or "Contact",
        "message": msg.message.strip(),
        "source": "landing",
        "client_ip": client_ip,
        "user_agent": request.headers.get("user-agent", "")[:400],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # 1. Durable record first. A mail outage must not lose the lead.
    stored = await persist.save_contact_submission(submission)

    # 2. Notification second, best effort.
    notified, _detail = await send_contact_email(submission)
    if notified and stored:
        await persist.mark_contact_notified(ticket)

    # 3. Bounded in-process buffer so the operator can still see it when
    #    the database is down or during local development.
    _contact_store.append({**submission, "stored": stored, "notified": notified})
    if len(_contact_store) > _CONTACT_BUFFER:
        del _contact_store[: len(_contact_store) - _CONTACT_BUFFER]

    # The caller gets the same answer either way: exposing whether mail or
    # storage failed would tell an attacker how to probe the deployment.
    return {
        "ok": True,
        "ticket": ticket,
        "message": "Message received. Our team will reply within 24 hours.",
    }
