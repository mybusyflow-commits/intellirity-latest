"""Real-time monitoring engine.

Extends the existing per-request scan modules with a continuous layer: events are
ingested (agent actions, prompts, data flows), scored live through the relevant
security modules, and aggregated into a rolling risk feed the dashboard can poll.
State is in-memory (single process) by design.
"""
from __future__ import annotations

import threading
import time
from typing import Any

from app.services.feature_registry import FEATURE_REGISTRY

# Modules that participate in the live scoring pipeline.
REALTIME_MODULES = [
    "jailbreak_injection_protection",
    "behavioral_analysis_engine",
    "ai_action_policy_enforcer",
    "data_loss_prevention",
]

_lock = threading.Lock()
_state: dict[str, Any] = {
    "events": [],            # newest first, capped
    "monitored": {},         # agent_id -> {risk, last_seen, events}
    "aggregate_risk": 0.0,
    "totals": {"block": 0, "flag": 0, "allow": 0},
}


def _score_event(event: dict) -> dict:
    findings: list[Any] = []
    max_risk = 0.0
    verdict = "allow"
    for mod in REALTIME_MODULES:
        if mod not in FEATURE_REGISTRY:
            continue
        try:
            res = FEATURE_REGISTRY[mod]["function"](event)
        except Exception:
            continue
        risk = float(res.get("risk_score", 0.0) or 0.0)
        v = res.get("verdict", "allow")
        if risk > max_risk:
            max_risk = risk
        if v == "block":
            verdict = "block"
        elif v == "flag" and verdict != "block":
            verdict = "flag"
        f = res.get("findings") or []
        if f:
            findings.extend(f)
    return {"risk_score": round(max_risk, 3), "verdict": verdict, "findings": findings}


def ingest(event: dict) -> dict:
    agent_id = event.get("agent_id") or event.get("source") or "unknown"
    scored = _score_event(event)
    record = {
        "id": f"rt-{int(time.time() * 1000)}",
        "ts": time.time(),
        "agent_id": agent_id,
        "verdict": scored["verdict"],
        "risk_score": scored["risk_score"],
        "findings": scored["findings"][:5],
        "summary": (scored["findings"][0] if scored["findings"] else "No issues detected"),
    }
    with _lock:
        _state["events"].insert(0, record)
        _state["events"] = _state["events"][:50]
        _state["totals"][scored["verdict"]] = _state["totals"].get(scored["verdict"], 0) + 1
        recent = _state["events"][:10]
        if recent:
            _state["aggregate_risk"] = round(sum(e["risk_score"] for e in recent) / len(recent), 3)
        m = _state["monitored"].setdefault(agent_id, {"risk": 0.0, "last_seen": 0.0, "events": 0})
        m["risk"] = scored["risk_score"]
        m["last_seen"] = record["ts"]
        m["events"] += 1
    return record


def get_feed() -> dict:
    with _lock:
        return {
            "aggregate_risk": _state["aggregate_risk"],
            "totals": _state["totals"],
            "monitored": _state["monitored"],
            "events": _state["events"],
        }
