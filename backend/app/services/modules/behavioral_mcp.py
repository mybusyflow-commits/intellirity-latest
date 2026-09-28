import re
import hashlib
from datetime import datetime, timezone
from app.services.feature_registry import register_feature


@register_feature(
    key="behavioral_analysis_engine",
    name="Behavioral Analysis Engine",
    description="Analyze agent behavior patterns over time to detect drift, anomalies, and policy violations. Inspired by Straiker's real-trace approach.",
    tier="professional",
)
def behavioral_analysis_engine(payload: dict) -> dict:
    agent_id = payload.get("agent_id", "unknown")
    session_id = payload.get("session_id", "")
    current_action = payload.get("current_action", {})
    session_history = payload.get("session_history", [])

    anomalies = []
    risk_score = 0.0

    if len(session_history) > 20:
        action_types = [h.get("action_type", "") for h in session_history]
        type_counts = {}
        for at in action_types:
            type_counts[at] = type_counts.get(at, 0) + 1

        for atype, count in type_counts.items():
            ratio = count / len(action_types)
            if ratio > 0.5 and len(action_types) > 10:
                anomalies.append({
                    "type": "action_type_dominance",
                    "detail": f"Action type '{atype}' dominates {ratio*100:.0f}% of session",
                    "severity": "medium",
                })
                risk_score += 0.3

    if session_history:
        timestamps = [h.get("timestamp", "") for h in session_history if h.get("timestamp")]
        if len(timestamps) >= 2:
            try:
                first = datetime.fromisoformat(timestamps[0].replace("Z", "+00:00"))
                last = datetime.fromisoformat(timestamps[-1].replace("Z", "+00:00"))
                duration = (last - first).total_seconds()

                if duration > 3600:
                    anomalies.append({
                        "type": "long_session",
                        "detail": f"Session duration {duration/60:.0f} minutes exceeds 1 hour",
                        "severity": "low",
                    })
                    risk_score += 0.1

                if len(timestamps) > 10 and duration > 0:
                    avg_interval = duration / len(timestamps)
                    if avg_interval < 1:
                        anomalies.append({
                            "type": "high_frequency_actions",
                            "detail": f"Average {avg_interval:.1f}s between actions (bot-like)",
                            "severity": "medium",
                        })
                        risk_score += 0.3
            except (ValueError, TypeError):
                pass

    destructive_actions = [h for h in session_history if h.get("action_type") in ["delete", "drop", "truncate", "remove", "destroy"]]
    if len(destructive_actions) > 3:
        anomalies.append({
            "type": "destructive_sequence",
            "detail": f"{len(destructive_actions)} destructive actions in session",
            "severity": "high",
        })
        risk_score += 0.5

    external_targets = set()
    for h in session_history:
        if h.get("target"):
            external_targets.add(h["target"])

    if len(external_targets) > 50:
        anomalies.append({
            "type": "excessive_targets",
            "detail": f"Contacted {len(external_targets)} unique external targets",
            "severity": "high",
        })
        risk_score += 0.4

    sensitive_systems = {"database", "production", "payment", "hr", "finance", "legal", "admin"}
    for h in session_history:
        target = h.get("target", "").lower()
        if any(sys_name in target for sys_name in sensitive_systems):
            if h.get("action_type") in ["write", "delete", "modify", "update", "drop", "truncate"]:
                anomalies.append({
                    "type": "sensitive_system_access",
                    "detail": f"Destructive action on sensitive system: {h.get('target', '')}",
                    "severity": "critical",
                })
                risk_score += 0.6
                break

    if len(session_history) >= 3:
        for i in range(len(session_history) - 2):
            window = session_history[i:i+3]
            if all(w.get("risk_level", 0) > 0.3 for w in window):
                anomalies.append({
                    "type": "sustained_high_risk",
                    "detail": f"3 consecutive high-risk actions at position {i}",
                    "severity": "high",
                })
                risk_score += 0.4
                break

    drift_detected = False
    baseline_actions = payload.get("baseline_action_types", [])
    current_types = set(h.get("action_type", "") for h in session_history)
    if baseline_actions:
        new_types = current_types - set(baseline_actions)
        if new_types:
            drift_detected = True
            anomalies.append({
                "type": "behavioral_drift",
                "detail": f"New action types not in baseline: {list(new_types)}",
                "severity": "medium",
            })
            risk_score += 0.3

    risk_score = min(risk_score, 1.0)

    return {
        "agent_id": agent_id,
        "session_id": session_id,
        "actions_analyzed": len(session_history),
        "anomalies_detected": len(anomalies),
        "anomalies": anomalies,
        "behavioral_drift": drift_detected,
        "risk_score": round(risk_score, 3),
        "risk_level": "critical" if risk_score >= 0.7 else "high" if risk_score >= 0.4 else "medium" if risk_score >= 0.2 else "low",
        "recommendation": "Behavior within normal parameters." if not anomalies else f"Review {len(anomalies)} behavioral anomalies.",
    }


@register_feature(
    key="mcp_security_monitor",
    name="MCP Security & Tool Governance",
    description="Monitor MCP servers and tool calls for poisoning, confused deputy attacks, and unauthorized tool usage.",
    tier="enterprise",
)
def mcp_security_monitor(payload: dict) -> dict:
    tool_calls = payload.get("tool_calls", [])
    mcp_servers = payload.get("mcp_servers", [])
    agent_permissions = payload.get("agent_permissions", [])

    findings = []
    risk_score = 0.0

    for server in mcp_servers:
        server_name = server.get("name", "")
        server_tools = server.get("tools", [])

        for tool in server_tools:
            desc = tool.get("description", "")
            if re.search(r"(?:ignore|override|bypass|reveal|system|instructions)", desc, re.IGNORECASE):
                findings.append({
                    "type": "tool_description_poisoning",
                    "severity": "critical",
                    "detail": f"Tool '{tool.get('name', '')}' in server '{server_name}' has suspicious description",
                })
                risk_score += 0.8

    for call in tool_calls:
        tool_name = call.get("tool", "")
        params = call.get("parameters", {})

        if tool_name not in agent_permissions and agent_permissions:
            findings.append({
                "type": "unauthorized_tool",
                "severity": "high",
                "detail": f"Tool '{tool_name}' called without permission",
            })
            risk_score += 0.6

        for key, value in params.items():
            if isinstance(value, str) and re.search(r"(?:http|https|webhook|callback|endpoint)", value, re.IGNORECASE):
                if not value.startswith(("https://trusted", "https://internal", "https://localhost")):
                    findings.append({
                        "type": "suspicious_tool_param",
                        "severity": "medium",
                        "detail": f"External URL in tool parameter '{key}'",
                    })
                    risk_score += 0.3

    if len(mcp_servers) >= 2:
        all_tool_names = {}
        for server in mcp_servers:
            for tool in server.get("tools", []):
                tool_name = tool.get("name", "")
                if tool_name in all_tool_names:
                    findings.append({
                        "type": "tool_name_collision",
                        "severity": "high",
                        "detail": f"Tool '{tool_name}' exists in multiple servers: '{all_tool_names[tool_name]}' and '{server.get('name', '')}'",
                    })
                    risk_score += 0.5
                all_tool_names[tool_name] = server.get("name", "")

        for server in mcp_servers:
            for tool in server.get("tools", []):
                desc = tool.get("description", "")
                if re.search(r"(?:modify|alter|change|override|replace)\s+(?:the\s+)?(?:behavior|output|result|response)\s+(?:of|from)\s+(?:other|another|different)\s+(?:tool|function|server)", desc, re.IGNORECASE):
                    findings.append({
                        "type": "tool_shadowing",
                        "severity": "critical",
                        "detail": f"Tool '{tool.get('name', '')}' in server '{server.get('name', '')}' attempts to modify other tools",
                    })
                    risk_score += 0.8

    for server in mcp_servers:
        server_name = server.get("name", "")
        if re.search(r"(?:malicious|untrusted|unverified|community|random|unknown|experimental|test)", server_name, re.IGNORECASE):
            findings.append({
                "type": "untrusted_server",
                "severity": "medium",
                "detail": f"MCP server '{server_name}' appears untrusted",
            })
            risk_score += 0.3

    risk_score = min(risk_score, 1.0)

    return {
        "servers_checked": len(mcp_servers),
        "tool_calls_checked": len(tool_calls),
        "findings": findings,
        "risk_score": round(risk_score, 3),
        "status": "clean" if not findings else "suspicious",
    }
