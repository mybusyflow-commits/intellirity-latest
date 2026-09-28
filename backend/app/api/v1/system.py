import asyncio
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel

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
    """Create a plausible random threat event and add it to the store."""
    template = random.choice(EVENT_TEMPLATES)
    t = add_threat_event(
        threat_type=template["threat_type"],
        severity=template["severity"],
        source=template["source"],
        description=template["description"],
    )
    # Cap the store so it never grows without bound (keeps API fast + score healthy)
    store = get_threats_store()
    if len(store) > 200:
        del store[200:]
    return t


async def live_event_loop():
    """Background task: inject a new threat event every few seconds."""
    while True:
        await asyncio.sleep(random.uniform(6, 11))
        if not _LIVE_MODE:
            continue
        generate_live_event()
        # Auto-resolve oldest active events (simulates analyst clearing the queue)
        store = get_threats_store()
        active = [t for t in store if not t["is_resolved"]]
        if len(active) > 40:
            # Resolve ~30% of the oldest active threats
            to_resolve = active[: max(1, int(len(active) * 0.3))]
            for t in to_resolve:
                t["is_resolved"] = True


# ─── System status ────────────────────────────────────────────────────────────

@router.get("/status")
async def system_status():
    return {
        "backend": "connected",
        "monitoring": "live" if _LIVE_MODE else "paused",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─── Live summary / KPIs ──────────────────────────────────────────────────────

@router.get("/summary")
async def system_summary():
    threats = get_threats_store()
    scans = get_scans_store()

    active = [t for t in threats if not t["is_resolved"]]
    resolved = [t for t in threats if t["is_resolved"]]

    # Score derived from the most recent window of threat activity (real stored data).
    recent = sorted(threats, key=lambda t: t["created_at"], reverse=True)[:30]
    recent_high = sum(1 for t in recent if t["severity"] == "high")
    recent_medium = sum(1 for t in recent if t["severity"] == "medium")
    recent_low = sum(1 for t in recent if t["severity"] == "low")

    raw_score = 100.0 - (recent_high * 1.5) - (recent_medium * 0.5) - (recent_low * 0.2)
    score = round(max(0.0, min(100.0, raw_score)), 1)

    risk_scores = [s.get("risk_score", 0.0) for s in scans if s.get("risk_score") is not None]
    avg_risk = round(sum(risk_scores) / len(risk_scores), 3) if risk_scores else 0.0

    # Models actually monitored = distinct model sources observed in the live threat feed.
    models_monitored = len({t.get("source") for t in threats if t.get("source")})

    compliance_score = round(max(0.0, min(100.0, score - 2.0)), 1)

    return {
        "security_score": score,
        "threats_blocked": len(resolved),
        "threats_active": len(active),
        "threats_high": sum(1 for t in active if t["severity"] == "high"),
        "models_monitored": models_monitored,
        "compliance_score": compliance_score,
        "total_scans": len(scans),
        "average_risk_score": avg_risk,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─── Contact form ─────────────────────────────────────────────────────────────

class ContactMessage(BaseModel):
    name: str
    email: str
    subject: str = ""
    message: str


_contact_store: list[dict] = []


@router.post("/contact")
async def contact(msg: ContactMessage):
    ticket = f"INT-{len(_contact_store) + 1001}"
    _contact_store.append({
        "ticket": ticket,
        **msg.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "ok": True,
        "ticket": ticket,
        "message": "Message received. Our team will reply within 24 hours.",
    }
