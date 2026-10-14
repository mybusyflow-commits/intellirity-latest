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
from pydantic import BaseModel
from typing import Optional
import httpx

from app.core.security import require_user
from app.api.v1.threats import add_threat_event
from app.services.feature_registry import FEATURE_REGISTRY

router = APIRouter()

UPSTREAM_DEFAULT = os.getenv("UPSTREAM_BASE_URL", "https://opencode.ai/zen/v1")
TIMEOUT = 30.0


class ProxyChatBody(BaseModel):
    messages: list[dict] = []
    model: str = "space-bunny-free"
    upstream_base: Optional[str] = None
    upstream_key: Optional[str] = None
    max_tokens: int = 512


def _call(key: str, payload: dict) -> dict:
    func = FEATURE_REGISTRY[key]["function"]
    return func(payload)


def _screen_input(text: str) -> dict:
    findings, top_risk, top_verdict = [], 0.0, "allow"
    for key in ("jailbreak_injection_protection", "data_loss_prevention",
                "content_moderation", "advanced_threat_intelligence"):
        try:
            r = _call(key, {"text": text, "direction": "input"})
        except Exception:
            continue
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
        except Exception:
            continue
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

    gate = _screen_input(prompt)
    if gate["verdict"] == "block":
        add_threat_event(threat_type="Proxy Input Block", severity="high",
                         source="reverse-proxy",
                         description=f"Blocked upstream call: {str(gate['details'])[:180]}")
        return {"verdict": "block", "upstream_called": False,
                "assistant": None, "input_screen": gate, "output_screen": None}

    base = (body.upstream_base or UPSTREAM_DEFAULT).rstrip("/")
    key = body.upstream_key or os.getenv("UPSTREAM_API_KEY", "") or os.getenv("OPENCODEZEN_API_KEY", "")
    if not key:
        raise HTTPException(status_code=422, detail="No upstream key: pass upstream_key or set UPSTREAM_API_KEY")
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(
                f"{base}/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"model": body.model, "messages": body.messages, "max_tokens": body.max_tokens},
            )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream unreachable: {type(exc).__name__}")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Upstream error {resp.status_code}")
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
        return {"verdict": "flag", "upstream_called": True, "assistant": None,
                "blocked_reason": out, "input_screen": gate, "output_screen": out}
    return {"verdict": "allow" if out["verdict"] == "allow" and gate["verdict"] == "allow" else "flag",
            "upstream_called": True, "assistant": assistant,
            "input_screen": gate, "output_screen": out}
