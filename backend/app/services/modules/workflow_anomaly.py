import re
from collections import Counter
from app.services.feature_registry import register_feature


@register_feature(
    key="workflow_anomaly_detector",
    name="Workflow & Automation Anomaly Detector",
    description="Detect hidden workflows, infinite loops, runaway spend, and cascading side effects in AI automation chains.",
    tier="professional",
)
def workflow_anomaly_detector(payload: dict) -> dict:
    workflow_id = payload.get("workflow_id", "")
    actions = payload.get("actions", [])
    config = payload.get("config", {})

    anomalies = []
    risk_score = 0.0

    max_iter = config.get("max_iterations", 100)
    max_spend = config.get("max_spend", 100.0)
    timeout = config.get("timeout_seconds", 300)
    max_chain_depth = config.get("max_chain_depth", 10)

    if len(actions) > max_iter:
        anomalies.append({"type": "excessive_iterations", "detail": f"{len(actions)} actions exceed limit of {max_iter}", "severity": "high"})
        risk_score += 0.6

    action_types = [a.get("type", "") for a in actions]
    for size in range(3, min(20, len(action_types) // 2)):
        for i in range(len(action_types) - size * 2):
            window = tuple(action_types[i:i+size])
            for j in range(i + size, len(action_types) - size):
                if tuple(action_types[j:j+size]) == window:
                    anomalies.append({"type": "repeating_loop", "detail": f"Repeating sequence of {size} actions at positions {i} and {j}", "severity": "critical"})
                    risk_score += 0.9
                    break

    total_spend = sum(a.get("cost", 0) for a in actions)
    if total_spend > max_spend:
        anomalies.append({"type": "runaway_spend", "detail": f"Total cost  exceeds budget ", "severity": "high"})
        risk_score += 0.7

    total_duration = sum(a.get("duration", 0) for a in actions)
    if total_duration > timeout:
        anomalies.append({"type": "timeout_exceeded", "detail": f"Duration {total_duration}s exceeds timeout {timeout}s", "severity": "medium"})
        risk_score += 0.4

    external = [a for a in actions if a.get("type") in ["api_call", "http_request", "external_service", "webhook"]]
    unique_targets = set(a.get("target", "") for a in external)
    if len(unique_targets) > 20:
        anomalies.append({"type": "excessive_external", "detail": f"Contacted {len(unique_targets)} unique external targets", "severity": "medium"})
        risk_score += 0.3

    type_counts = Counter(action_types)
    for atype, count in type_counts.items():
        if count > max_iter * 0.5:
            anomalies.append({"type": "action_imbalance", "detail": f"Action type '{atype}' appears {count} times ({count/len(actions)*100:.0f}%)", "severity": "low"})
            risk_score += 0.2

    depth = payload.get("chain_depth", 0)
    if depth > max_chain_depth:
        anomalies.append({"type": "deep_chain", "detail": f"Chain depth {depth} exceeds maximum {max_chain_depth}", "severity": "medium"})
        risk_score += 0.3

    destructive = [a for a in actions if a.get("type") in ["delete", "drop", "truncate", "remove", "destroy", "kill"]]
    if len(destructive) > 5:
        anomalies.append({"type": "destructive_sequence", "detail": f"{len(destructive)} destructive actions in sequence", "severity": "high"})
        risk_score += 0.5

    risk_score = min(risk_score, 1.0)

    return {
        "workflow_id": workflow_id,
        "total_actions": len(actions),
        "total_cost": round(total_spend, 2),
        "duration_seconds": total_duration,
        "anomalies_detected": len(anomalies),
        "anomalies": anomalies,
        "risk_score": round(risk_score, 3),
        "recommendation": "Workflow appears normal." if not anomalies else f"Review {len(anomalies)} detected anomalies.",
    }
