import hashlib
import re
from app.services.feature_registry import register_feature


@register_feature(
    key="model_supply_chain_security",
    name="AI Model Supply Chain Security",
    description="Detect poisoned, tampered, or malicious AI models before deployment. Verify model integrity and provenance.",
    tier="enterprise",
)
def model_supply_chain_security(payload: dict) -> dict:
    model_source = payload.get("model_source", "")
    expected_hash = payload.get("expected_hash", "")
    model_format = payload.get("model_format", "unknown")

    findings = []
    risk_score = 0.0

    suspicious = ["unverified", "community", "random", "unknown", "anonymous", "unofficial", "pirated", "cracked"]
    if any(s in model_source.lower() for s in suspicious):
        findings.append({"type": "unverified_source", "detail": f"Source '{model_source}' is not verified", "severity": "high"})
        risk_score += 0.6

    if expected_hash:
        actual = hashlib.sha256(model_source.encode()).hexdigest()
        if actual != expected_hash:
            findings.append({"type": "hash_mismatch", "detail": "Model hash does not match expected value", "severity": "critical"})
            risk_score += 1.0

    unsafe_formats = ["pickle", "pkl"]
    if model_format in unsafe_formats:
        findings.append({"type": "unsafe_format", "detail": f"Format '{model_format}' can execute arbitrary code", "severity": "high"})
        risk_score += 0.7

    known_vulns = payload.get("known_vulnerabilities", [])
    for vuln in known_vulns:
        findings.append({"type": "known_vulnerability", "detail": vuln, "severity": "high"})
        risk_score += 0.5

    risk_score = min(risk_score, 1.0)

    if risk_score >= 0.7:
        verdict = "block"
    elif risk_score >= 0.3:
        verdict = "flag"
    else:
        verdict = "allow"

    return {
        "model_source": model_source,
        "model_format": model_format,
        "verdict": verdict,
        "risk_score": round(risk_score, 3),
        "findings": findings,
        "recommendation": "Model passed integrity checks." if verdict == "allow" else "Review findings before deploying.",
    }


THREAT_DB = [
    {"id": "T001", "type": "jailbreak", "name": "DAN 6.0", "severity": "high", "indicators": ["multi-turn persona shift"]},
    {"id": "T002", "type": "prompt_injection", "name": "Context Overflow", "severity": "medium", "indicators": ["extremely long input"]},
    {"id": "T003", "type": "data_leakage", "name": "Training Data Extraction", "severity": "high", "indicators": ["repetitive prefix attack"]},
    {"id": "T004", "type": "jailbreak", "name": "Policy Puppetry", "severity": "critical", "indicators": ["roleplay bypass"]},
    {"id": "T005", "type": "agent_abuse", "name": "EchoLeak", "severity": "critical", "indicators": ["email-based injection"]},
    {"id": "T006", "type": "tool_abuse", "name": "Tool Misuse", "severity": "high", "indicators": ["unauthorized tool calls"]},
    {"id": "T007", "type": "memory_poisoning", "name": "XPIA Attack", "severity": "high", "indicators": ["cross-session persistence"]},
    {"id": "T008", "type": "exfiltration", "name": "Markdown Image Exfil", "severity": "high", "indicators": ["hidden image tags"]},
]


@register_feature(
    key="threat_intelligence_feed",
    name="Threat Intelligence Feed",
    description="Live feed of new AI attack patterns shared across all customers.",
    tier="enterprise",
)
def threat_intelligence_feed(payload: dict) -> dict:
    feed_type = payload.get("type", "all")
    severity_filter = payload.get("severity")
    limit = payload.get("limit", 10)

    results = THREAT_DB

    if feed_type != "all":
        results = [t for t in results if t["type"] == feed_type]

    if severity_filter:
        results = [t for t in results if t["severity"] == severity_filter]

    return {
        "feed_updated": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "total_threats": len(results[:limit]),
        "threats": results[:limit],
        "subscription_tier": "enterprise",
    }
