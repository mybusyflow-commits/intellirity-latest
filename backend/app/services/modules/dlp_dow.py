import re
import hashlib
from datetime import datetime, timezone
from app.services.feature_registry import register_feature


@register_feature(
    key="denial_of_wallet_protector",
    name="Denial of Wallet Protector",
    description="Detect and prevent excessive API usage, runaway loops, and resource exhaustion attacks on AI systems.",
    tier="professional",
)
def denial_of_wallet_protector(payload: dict) -> dict:
    session_id = payload.get("session_id", "")
    api_calls = payload.get("api_calls", [])
    token_usage = payload.get("token_usage", {})
    config = payload.get("config", {})

    alerts = []
    risk_score = 0.0

    max_tokens_per_session = config.get("max_tokens_per_session", 100000)
    max_api_calls_per_minute = config.get("max_api_calls_per_minute", 60)
    max_cost_per_session = config.get("max_cost_per_session", 50.0)

    total_tokens = token_usage.get("total", 0)
    if total_tokens > max_tokens_per_session:
        alerts.append({"type": "token_limit", "detail": f"Used {total_tokens} tokens (limit: {max_tokens_per_session})", "severity": "high"})
        risk_score += 0.6

    total_cost = sum(call.get("cost", 0) for call in api_calls)
    if total_cost > max_cost_per_session:
        alerts.append({"type": "cost_limit", "detail": f"Cost ${total_cost:.2f} exceeds limit ${max_cost_per_session:.2f}", "severity": "high"})
        risk_score += 0.7

    if len(api_calls) >= 5:
        costs = [call.get("cost", 0) for call in api_calls]
        avg_cost = sum(costs) / len(costs)
        max_call_cost = max(costs)
        if max_call_cost > avg_cost * 5:
            alerts.append({"type": "cost_spike", "detail": f"API call cost spike detected: ${max_call_cost:.4f} vs avg ${avg_cost:.4f}", "severity": "medium"})
            risk_score += 0.3

    if len(api_calls) >= 2:
        timestamps = [c.get("timestamp", 0) for c in api_calls]
        intervals = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]
        if intervals:
            avg_interval = sum(intervals) / len(intervals)
            if avg_interval < 1:
                alerts.append({"type": "rapid_fire", "detail": f"Average {avg_interval:.2f}s between API calls", "severity": "medium"})
                risk_score += 0.4

    loop_patterns = _detect_api_loops(api_calls)
    if loop_patterns:
        alerts.extend(loop_patterns)
        risk_score += 0.5

    risk_score = min(risk_score, 1.0)

    return {
        "session_id": session_id,
        "total_tokens": total_tokens,
        "total_cost": round(total_cost, 2),
        "api_calls_count": len(api_calls),
        "alerts": alerts,
        "risk_score": round(risk_score, 3),
        "action": "block" if risk_score >= 0.8 else "throttle" if risk_score >= 0.5 else "monitor",
    }


def _detect_api_loops(api_calls: list) -> list:
    alerts = []
    if len(api_calls) < 10:
        return alerts

    signatures = []
    for call in api_calls:
        sig = f"{call.get('endpoint', '')}:{call.get('method', '')}:{hash(str(call.get('params', {}))) % 1000}"
        signatures.append(sig)

    for size in range(3, min(10, len(signatures) // 2)):
        for i in range(len(signatures) - size * 2):
            window = tuple(signatures[i:i+size])
            for j in range(i + size, len(signatures) - size):
                if tuple(signatures[j:j+size]) == window:
                    alerts.append({
                        "type": "api_loop",
                        "detail": f"Repeating API call pattern of size {size} at positions {i} and {j}",
                        "severity": "high",
                    })
                    return alerts

    return alerts


@register_feature(
    key="data_loss_prevention",
    name="Data Loss Prevention (DLP)",
    description="Advanced data loss prevention for AI systems. Detects PII, credentials, intellectual property, and regulated data in AI inputs and outputs.",
    tier="professional",
)
def data_loss_prevention(payload: dict) -> dict:
    text = payload.get("text", "")
    direction = payload.get("direction", "input")
    custom_patterns = payload.get("custom_patterns", [])
    data_classification = payload.get("data_classification", "standard")

    findings = []
    risk_score = 0.0

    pii_findings = _detect_pii(text)
    if pii_findings:
        findings.extend(pii_findings)
        # Severity-weighted: regulated identifiers and credentials escalate
        # on their own; ordinary contact details only escalate in bulk.
        for f in pii_findings:
            if f.get("subtype") in ("ssn", "credit_card", "date_of_birth"):
                risk_score += 0.45
            else:
                risk_score += 0.15

    credential_findings = _detect_credentials(text)
    if credential_findings:
        findings.extend(credential_findings)
        risk_score += len(credential_findings) * 0.45

    code_findings = _detect_code_leak(text)
    if code_findings:
        findings.extend(code_findings)
        risk_score += len(code_findings) * 0.2

    for pattern in custom_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            findings.append({"type": "custom_pattern", "detail": f"Custom pattern matched: {pattern[:50]}", "severity": "medium"})
            risk_score += 0.3

    risk_score = min(risk_score, 1.0)

    return {
        "direction": direction,
        "data_classification": data_classification,
        "findings": findings,
        "findings_count": len(findings),
        "risk_score": round(risk_score, 3),
        "action": "block" if risk_score >= 0.7 else "redact" if risk_score >= 0.4 else "log",
    }


def _detect_pii(text: str) -> list:
    findings = []
    pii_patterns = {
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "phone_us": r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
        "credit_card": r"\b(?:\d{4}[\s-]?){3}\d{4}\b",
        "ip_address": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
        "date_of_birth": r"\b(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b",
    }

    for pii_type, pattern in pii_patterns.items():
        matches = re.findall(pattern, text)
        if not matches:
            continue
        if pii_type == "date_of_birth":
            # A bare YYYY-MM-DD is usually a meeting date, not a birthday.
            # Only count it when birth context is present.
            if not re.search(r"\b(dob|birth|born|birthday|d\.o\.b)\b", text, re.IGNORECASE):
                continue
        findings.append({"type": "pii", "subtype": pii_type, "count": len(matches), "severity": "high"})

    return findings


def _detect_credentials(text: str) -> list:
    findings = []
    cred_patterns = {
        "aws_key": r"(?:AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}",
        "github_token": r"(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}",
        "stripe_key": r"sk-(?:test|prod|live)_[a-zA-Z0-9]{20,}",
        "google_api": r"AIza[a-zA-Z0-9_-]{35}",
        "slack_token": r"xox[pboa]-[a-zA-Z0-9-]{10,48}",
        "jwt": r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+",
        "private_key": r"-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH|PRIVATE)\s+KEY",
        "password_assignment": r"(?:password|passwd|pwd|secret|token|api_key)\s*[:=]\s*[\"'][^\"']{4,}[\"']",
    }

    for cred_type, pattern in cred_patterns.items():
        if re.search(pattern, text, re.IGNORECASE):
            findings.append({"type": "credential", "subtype": cred_type, "severity": "critical"})

    return findings


def _detect_code_leak(text: str) -> list:
    findings = []

    if re.search(r"(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\s+.*(?:'|\"|\{).*?(?:\+|\.|\|\||CONCAT)", text, re.IGNORECASE):
        findings.append({"type": "sql_injection_output", "severity": "high"})

    if re.search(r"<\s*script[^>]*>", text, re.IGNORECASE):
        findings.append({"type": "xss_output", "severity": "high"})

    if re.search(r"(?:eval|exec|system|subprocess|os\.system)\s*\(", text, re.IGNORECASE):
        findings.append({"type": "code_execution_output", "severity": "critical"})

    return findings
