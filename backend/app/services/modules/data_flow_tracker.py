import re
from app.services.feature_registry import register_feature


@register_feature(
    key="data_flow_tracker",
    name="Data Flow Tracker",
    description="Map every destination your AI data reaches across the pipeline. Monitor backend behavior, reasoning chains, and detect data exfiltration attempts.",
    tier="professional",
)
def data_flow_tracker(payload: dict) -> dict:
    data_id = payload.get("data_id", "")
    pipeline_stages = payload.get("pipeline_stages", [])
    data_classification = payload.get("data_classification", "unknown")
    backend_monitor = payload.get("backend_monitor", {})

    tracked = []
    flagged = []
    risk_score = 0.0

    trusted = payload.get("trusted_domains", [])
    blocked = payload.get("blocked_domains", [])

    for stage in pipeline_stages:
        dest = stage.get("destination", "")
        name = stage.get("stage", "unknown")
        accessed = stage.get("data_accessed", [])

        tracked.append({"stage": name, "destination": dest, "data_accessed": accessed, "timestamp": stage.get("timestamp", "")})

        if dest in blocked:
            flagged.append({"destination": dest, "reason": "In blocked list", "severity": "high"})
            risk_score += 0.7
        elif trusted and dest not in trusted:
            flagged.append({"destination": dest, "reason": "Not in trusted list", "severity": "medium"})
            risk_score += 0.3

        if accessed and data_classification in ("sensitive", "restricted"):
            for field in accessed:
                if any(k in str(field).lower() for k in ["password", "secret", "key", "token", "ssn", "credit"]):
                    flagged.append({"destination": dest, "reason": f"Sensitive field '{field}' accessed", "severity": "high"})
                    risk_score += 0.8

    reasoning_flags = []
    tool_call_anomalies = []

    if backend_monitor:
        reasoning_chain = backend_monitor.get("reasoning_chain", [])
        tool_calls = backend_monitor.get("tool_calls", [])

        for call in tool_calls:
            tool = call.get("tool", "")
            if tool in ["delete", "drop", "write", "execute", "rm", "format", "kill"]:
                reasoning_flags.append({"tool": tool, "reasoning": call.get("reasoning", ""), "flag": "destructive_tool_call"})

            if re.search(r"(?:http|https|webhook|callback)\s*[:=]\s*[\"']?https?://(?!(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.))", str(call), re.IGNORECASE):
                tool_call_anomalies.append({"tool": tool, "issue": "external_destination", "severity": "high"})
                risk_score += 0.6

        if len(reasoning_chain) > 50:
            reasoning_flags.append({"flag": "excessive_reasoning", "detail": f"Reasoning chain has {len(reasoning_chain)} steps"})

    risk_score = min(risk_score, 1.0)

    return {
        "data_id": data_id,
        "data_classification": data_classification,
        "destinations_tracked": len(tracked),
        "flagged_destinations": flagged,
        "reasoning_flags": reasoning_flags,
        "tool_call_anomalies": tool_call_anomalies,
        "risk_score": round(risk_score, 3),
        "status": "clean" if risk_score < 0.3 else "warning" if risk_score < 0.7 else "critical",
    }
