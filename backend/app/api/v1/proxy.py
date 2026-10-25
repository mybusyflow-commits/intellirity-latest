"""Screening reverse proxy: prompts are judged BEFORE spend, outputs before delivery.

POST /api/v1/proxy/chat with OpenAI-style {messages, model}:
  1. Last user message runs jailbreak + DLP + moderation + advanced intel.
     A block verdict returns immediately — the upstream LLM is never called.
  2. Otherwise the request forwards to an OpenAI-compatible upstream
     (defaults to the configured Zen gateway) and the reply is screened
     for leaks and harmful content before delivery.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import httpx

from app.core.security import require_user
from app.api.v1.threats import add_threat_event
from app.services.feature_registry import FEATURE_REGISTRY

router = APIRouter()

TIMEOUT = 30.0


class ProxyChatBody(BaseModel):
    messages: list[dict] = []
    model: str = ""
    # The upstream is operator-configured on purpose. Accepting a
    # client-supplied base URL turns this endpoint into an authenticated
    # SSRF primitive (internal services, cloud metadata) and would send the
    # caller's key to a host they choose.
    upstream_key: Optional[str] = None
    max_tokens: int = Field(default=512, ge=1, le=8192)


def _upstream_base() -> str:
    """The one upstream this deployment will talk to.

    Falls back to the reasoning gateway so the proxy and model discovery can
    never point at two different providers (which would send one provider's
    key to another).
    """
    return (
        os.getenv("UPSTREAM_BASE_URL")
        or os.getenv("OPENCODEZEN_BASE_URL")
        or "https://opencode.ai/zen/v1"
    ).rstrip("/")


def _call(key: str, payload: dict) -> dict:
    func = FEATURE_REGISTRY[key]["function"]
    return func(payload)


def _screen_input(text: str) -> dict:
    findings, top_risk, top_verdict = [], 0.0, "allow"
    for key in ("jailbreak_injection_protection", "data_loss_prevention",
                "content_moderation", "advanced_threat_intelligence"):
        try:
            r = _call(key, {"text": text, "direction": "input"})
        except Exception as exc:
            # Fail CLOSED: a screening engine that crashes must never let the
            # prompt through unscreened. Deny and surface the fault.
            return {
                "verdict": "block",
                "risk_score": 1.0,
                "details": [{"module": key, "error": f"{type(exc).__name__}: screening unavailable"}],
                "screening_error": True,
            }
        risk = float(r.get("risk_score", 0) or 0)
        verdict = str(r.get("verdict") or r.get("threat_level") or r.get("action") or "allow").lower()
        if r.get("findings"):
            findings.append({"module": key, "findings": r["findings"][:3]})
        if risk > top_risk:
            top_risk = risk
        if verdict in ("block", "critical", "high"):
            top_verdict = "block"
        elif verdict in ("flag", "medium", "warning", "suspicious") and top_verdict == "allow":
            top_verdict = "flag"
    if top_risk >= 0.7:
        top_verdict = "block"
    elif top_risk >= 0.3 and top_verdict == "allow":
        top_verdict = "flag"
    return {"verdict": top_verdict, "risk_score": round(top_risk, 3), "details": findings}


def _screen_output(text: str) -> dict:
    findings, top_risk, top_verdict = [], 0.0, "allow"
    for key in ("data_loss_prevention", "content_moderation"):
        try:
            r = _call(key, {"text": text, "direction": "output"})
        except Exception as exc:
            # Fail CLOSED on delivery: withhold the reply rather than ship
            # an unscreened answer.
            return {
                "verdict": "block",
                "risk_score": 1.0,
                "details": [{"module": key, "error": f"{type(exc).__name__}: screening unavailable"}],
                "screening_error": True,
            }
        risk = float(r.get("risk_score", 0) or 0)
        verdict = str(r.get("verdict") or r.get("action") or "allow").lower()
        if r.get("findings"):
            findings.append({"module": key, "findings": r["findings"][:3]})
        if risk > top_risk:
            top_risk = risk
        if verdict in ("block", "redact", "critical", "high"):
            top_verdict = "block"
        elif verdict in ("flag", "medium", "warning", "suspicious") and top_verdict == "allow":
            top_verdict = "flag"
    if top_risk >= 0.7:
        top_verdict = "block"
    elif top_risk >= 0.3 and top_verdict == "allow":
        top_verdict = "flag"
    return {"verdict": top_verdict, "risk_score": round(top_risk, 3), "details": findings}


@router.post("/chat")
async def proxy_chat(body: ProxyChatBody, user: dict = Depends(require_user)):
    if not body.messages or not isinstance(body.messages, list):
        raise HTTPException(status_code=422, detail="messages[] is required")
    user_texts = [m.get("content", "") for m in body.messages
                  if isinstance(m, dict) and m.get("role") == "user" and isinstance(m.get("content"), str)]
    if not user_texts:
        raise HTTPException(status_code=422, detail="at least one user message is required")
    prompt = user_texts[-1]
    if len(prompt) > 50_000:
        raise HTTPException(status_code=422, detail="Prompt too long (max 50,000 chars)")
    total_chars = sum(
        len(m.get("content", "")) for m in body.messages
        if isinstance(m, dict) and isinstance(m.get("content"), str)
    )
    if total_chars > 200_000:
        raise HTTPException(status_code=413, detail="Conversation too large (max 200,000 chars)")

    gate = _screen_input(prompt)
    if gate["verdict"] == "block":
        add_threat_event(threat_type="Proxy Input Block", severity="high",
                         source="reverse-proxy",
                         description=f"Blocked upstream call: {str(gate['details'])[:180]}")
        if gate.get("screening_error"):
            raise HTTPException(status_code=503, detail="Screening engine unavailable — request denied (fail closed)")
        return {"verdict": "block", "upstream_called": False,
                "assistant": None, "input_screen": gate, "output_screen": None}

    base = _upstream_base()
    key = body.upstream_key or os.getenv("UPSTREAM_API_KEY", "") or os.getenv("OPENCODEZEN_API_KEY", "")
    if not key:
        raise HTTPException(status_code=422, detail="No upstream key: pass upstream_key or set UPSTREAM_API_KEY")

    # Resolve the model against the upstream's live catalogue — hardcoded ids
    # go stale and the gateway then rejects the call.
    from app.services.reasoning import pick_model
    model = body.model or os.getenv("OPENCODEZEN_MODEL", "")
    try:
        model = await pick_model(model)
    except Exception:
        model = model or "minimax-m3.1-flash-free"
    if not model:
        raise HTTPException(status_code=422, detail="No upstream model could be resolved")

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                f"{base}/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": model, "messages": body.messages, "max_tokens": body.max_tokens},
            )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream unreachable: {type(exc).__name__}")
    if resp.status_code != 200:
        # Surface the gateway's own reason (402 no funds, 403 free tier is
        # CLI-only, 404 unknown model) instead of a bare status code.
        detail = ""
        try:
            body = resp.json()
            err = body.get("error") if isinstance(body, dict) else None
            if isinstance(err, dict):
                detail = str(err.get("message") or err.get("type") or "")
            elif isinstance(err, str):
                detail = err
            elif isinstance(body, dict) and body.get("message"):
                detail = str(body["message"])
        except Exception:
            detail = (resp.text or "")[:200]
        raise HTTPException(status_code=502, detail=f"Upstream error {resp.status_code}: {detail or 'no detail'}")
    try:
        data = resp.json()
        assistant = data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(status_code=502, detail="Upstream returned an unreadable reply")

    out = _screen_output(assistant or "")
    if out["verdict"] == "block":
        add_threat_event(threat_type="Proxy Output Block", severity="high",
                         source="reverse-proxy",
                         description=f"Blocked upstream reply: {str(out['details'])[:180]}")
        if out.get("screening_error"):
            raise HTTPException(status_code=503, detail="Output screening unavailable — reply withheld (fail closed)")
        return {"verdict": "flag", "upstream_called": True, "assistant": None,
                "blocked_reason": out, "input_screen": gate, "output_screen": out}
        return {"verdict": "allow" if out["verdict"] == "allow" and gate["verdict"] == "allow" else "flag",
                "upstream_called": True, "assistant": assistant, "model": model,
                "input_screen": gate, "output_screen": out}
