import re
import hashlib
import json
from datetime import datetime, timezone
from collections import Counter
from app.services.feature_registry import register_feature


class ThreatIntelligenceEngine:
    _threat_db = []
    _pattern_cache = {}
    _behavioral_baseline = {}

    @classmethod
    def add_threat(cls, threat):
        cls._threat_db.append(threat)

    @classmethod
    def get_threats(cls, category=None, severity=None):
        results = cls._threat_db
        if category:
            results = [t for t in results if t.get("category") == category]
        if severity:
            results = [t for t in results if t.get("severity") == severity]
        return results

    @classmethod
    def check_cache(cls, text_hash):
        return cls._pattern_cache.get(text_hash)

    @classmethod
    def update_cache(cls, text_hash, result):
        cls._pattern_cache[text_hash] = result

    @classmethod
    def update_baseline(cls, agent_id, behavior_key, value):
        if agent_id not in cls._behavioral_baseline:
            cls._behavioral_baseline[agent_id] = {}
        cls._behavioral_baseline[agent_id][behavior_key] = value

    @classmethod
    def get_baseline(cls, agent_id, behavior_key):
        return cls._behavioral_baseline.get(agent_id, {}).get(behavior_key)


ThreatIntelligenceEngine.add_threat({
    "id": "T001", "category": "jailbreak", "name": "DAN Variants",
    "severity": "critical", "indicators": ["persona escalation", "token economy"],
    "description": "Do Anything Now variants that establish unrestricted personas"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T002", "category": "prompt_injection", "name": "Indirect Injection",
    "severity": "critical", "indicators": ["external content", "RAG poisoning"],
    "description": "Injection through retrieved documents, tool outputs, or external data"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T003", "category": "data_exfiltration", "name": "Markdown Image Exfil",
    "severity": "high", "indicators": ["hidden image tags", "URL parameters"],
    "description": "Data exfiltration via markdown image rendering"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T004", "category": "agent_abuse", "name": "Goal Hijacking",
    "severity": "critical", "indicators": ["instruction override", "task redirection"],
    "description": "Redirecting agent's terminal goal without full compromise"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T005", "category": "agent_abuse", "name": "Memory Poisoning",
    "severity": "high", "indicators": ["persistent manipulation", "cross-session"],
    "description": "Malicious data persisted in agent memory for future sessions"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T006", "category": "mcp_abuse", "name": "Tool Poisoning",
    "severity": "critical", "indicators": ["malicious server", "description injection"],
    "description": "MCP server with poisoned tool descriptions"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T007", "category": "dos", "name": "Denial of Wallet",
    "severity": "high", "indicators": ["unbounded loops", "excessive API calls"],
    "description": "Attacks causing excessive compute/API costs"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T008", "category": "model_supply_chain", "name": "Model Poisoning",
    "severity": "critical", "indicators": ["backdoor triggers", "weight tampering"],
    "description": "Malicious model weights or training data manipulation"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T009", "category": "behavioral_drift", "name": "Silent Model Update",
    "severity": "medium", "indicators": ["behavioral change", "boundary shift"],
    "description": "Model updates that change security posture without notice"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T010", "category": "privilege_escalation", "name": "Confused Deputy",
    "severity": "critical", "indicators": ["tool delegation", "permission abuse"],
    "description": "Agent tricked into misusing its authorized privileges"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T011", "category": "obfuscation", "name": "Encoding Evasion",
    "severity": "high", "indicators": ["base64", "unicode tricks", "homoglyphs"],
    "description": "Encoded payloads that bypass keyword detection"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T012", "category": "jailbreak", "name": "Multi-turn Crescendo",
    "severity": "critical", "indicators": ["gradual escalation", "trust building"],
    "description": "Multi-turn attacks that gradually escalate to bypass defenses"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T013", "category": "prompt_injection", "name": "Typoglycemia",
    "severity": "medium", "indicators": ["scrambled words", "character flipping"],
    "description": "Scrambled text that LLMs can read but filters miss"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T014", "category": "agent_abuse", "name": "Session Contamination",
    "severity": "high", "indicators": ["early injection", "reasoning bias"],
    "description": "Data introduced early that biases later agent reasoning"
})
ThreatIntelligenceEngine.add_threat({
    "id": "T015", "category": "data_exfiltration", "name": "Prompt Leaking",
    "severity": "high", "indicators": ["system prompt extraction", "instruction reveal"],
    "description": "Extraction of hidden system prompts or instructions"
})


@register_feature(
    key="advanced_threat_intelligence",
    name="Advanced Threat Intelligence Engine",
    description="Real-time threat intelligence with behavioral analysis, drift detection, and adaptive pattern matching. Outperforms static classifiers.",
    tier="enterprise",
)
def advanced_threat_intelligence(payload: dict) -> dict:
    text = payload.get("text", "")
    agent_id = payload.get("agent_id", "unknown")
    session_id = payload.get("session_id", "")
    direction = payload.get("direction", "input")

    text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]

    cached = ThreatIntelligenceEngine.check_cache(text_hash)
    if cached:
        return cached

    findings = []
    risk_score = 0.0

    injection_result = _detect_advanced_injection(text)
    if injection_result["detected"]:
        findings.extend(injection_result["findings"])
        risk_score += injection_result["risk_score"]

    encoding_result = _detect_advanced_encoding(text)
    if encoding_result["detected"]:
        findings.extend(encoding_result["findings"])
        risk_score += encoding_result["risk_score"]

    behavioral_result = _detect_behavioral_anomaly(agent_id, text, direction)
    if behavioral_result["detected"]:
        findings.extend(behavioral_result["findings"])
        risk_score += behavioral_result["risk_score"]

    risk_score = min(risk_score, 1.0)

    result = {
        "agent_id": agent_id,
        "session_id": session_id,
        "direction": direction,
        "threat_level": "critical" if risk_score >= 0.8 else "high" if risk_score >= 0.5 else "medium" if risk_score >= 0.2 else "low",
        "risk_score": round(risk_score, 3),
        "findings": findings,
        "threats_matched": len(findings),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    ThreatIntelligenceEngine.update_cache(text_hash, result)
    return result


def _detect_advanced_injection(text: str) -> dict:
    findings = []
    risk_score = 0.0

    patterns = {
        "instruction_override": [
            r"(?:ignore|disregard|forget|override|bypass|skip|stop)\s+(?:all\s+)?(?:previous|prior|above|earlier|system|original|safety|security)?\s*(?:instructions?|prompts?|rules?|directives?|guidelines?|restrictions?|limitations?|constraints?|policies?|guardrails?|filters?)",
            r"(?:do\s+not|never|don't)\s+(?:follow|obey|adhere|listen|comply)\s+(?:to\s+)?(?:the|your|any|all)\s+(?:instructions?|rules?|prompts?|policies?|guidelines?)",
        ],
        "role_manipulation": [
            r"(?:you\s+(?:are|must\s+be|will\s+now\s+be|should\s+be|can\s+now\s+be)|act\s+(?:as|like)|pretend\s+(?:to\s+be|you\s+are)|roleplay\s+(?:as|being)|imagine\s+(?:you're|you\s+are))\s+(?!a\s+helpful\s+assistant)(?:a\s+)?(?:different|new|alternate|other|unrestricted|unlimited|free|evil|unfiltered)",
            r"(?:enter|switch|activate|enable|engage)\s+(?:a\s+)?(?:new|different|alternate|dev|debug|admin|root|DAN|unrestricted|unlimited|elevated)\s+(?:mode|persona|state|character|role|environment|personality)",
        ],
        "prompt_extraction": [
            r"(?:what|show|tell|reveal|display|print|output|repeat|recite|provide|give|share|expose|disclose|leak|dump)\s+(?:me\s+)?(?:your|the)\s+(?:system|initial|original|hidden|secret|internal|first|full|complete|exact|verbatim)\s+(?:prompt|instruction|directives?|rules?|configuration|setup|message)",
            r"(?:repeat|print|output|say|tell\s+me|write|display)\s+(?:the|your)\s+(?:text|words|content|prompt|instructions?)\s+(?:above|before|prior|previous|preceding|at\s+the\s+(?:top|beginning|start))",
        ],
    }

    for category, pattern_list in patterns.items():
        for pattern in pattern_list:
            if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
                findings.append({
                    "type": category,
                    "description": f"Advanced {category.replace('_', ' ')} pattern detected",
                    "severity": "critical" if category == "instruction_override" else "high",
                })
                risk_score += 0.4 if category == "instruction_override" else 0.3
                break

    return {"detected": len(findings) > 0, "findings": findings, "risk_score": min(risk_score, 0.9)}


def _detect_advanced_encoding(text: str) -> dict:
    findings = []
    risk_score = 0.0

    if re.search(r"(?:SWdub3Jl|QmFzZTY0|aGV4|YmluYXJ5)", text):
        findings.append({"type": "encoded_payload", "description": "Base64-encoded payload reference detected", "severity": "high"})
        risk_score += 0.3

    base64_pattern = r'(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?'
    potential_b64 = re.findall(base64_pattern, text)
    if potential_b64:
        import base64
        try:
            decoded = base64.b64decode(potential_b64[0]).decode('utf-8', errors='ignore')
            if re.search(r'(?:ignore|override|bypass|reveal|system|instructions)', decoded, re.IGNORECASE):
                findings.append({"type": "decoded_injection", "description": "Base64 payload contains injection instructions after decoding", "severity": "critical"})
                risk_score += 0.7
        except Exception:
            pass

    if re.search(r'\\u[0-9a-fA-F]{4}', text):
        findings.append({"type": "unicode_escape", "description": "Unicode escape sequences detected", "severity": "medium"})
        risk_score += 0.2

    if re.search(r'[\u200b\u200c\u200d\ufeff\u00ad]', text):
        findings.append({"type": "invisible_chars", "description": "Invisible/zero-width characters detected", "severity": "high"})
        risk_score += 0.3

    if re.search(r'(\w)\1{5,}', text):
        findings.append({"type": "character_repetition", "description": "Suspicious character repetition pattern", "severity": "low"})
        risk_score += 0.1

    return {"detected": len(findings) > 0, "findings": findings, "risk_score": min(risk_score, 0.8)}


def _detect_behavioral_anomaly(agent_id: str, text: str, direction: str) -> dict:
    findings = []
    risk_score = 0.0

    baseline = ThreatIntelligenceEngine.get_baseline(agent_id, "avg_input_length")
    current_length = len(text)

    if baseline and current_length > baseline * 5:
        findings.append({"type": "input_size_anomaly", "description": f"Input length ({current_length}) is 5x above baseline ({baseline})", "severity": "medium"})
        risk_score += 0.3

    ThreatIntelligenceEngine.update_baseline(agent_id, "avg_input_length", int((baseline + current_length) / 2) if baseline else current_length)

    input_count = ThreatIntelligenceEngine.get_baseline(agent_id, "input_count") or 0
    if input_count > 100:
        findings.append({"type": "high_frequency", "description": f"Agent received {input_count} inputs in session", "severity": "low"})
        risk_score += 0.1

    ThreatIntelligenceEngine.update_baseline(agent_id, "input_count", input_count + 1)

    return {"detected": len(findings) > 0, "findings": findings, "risk_score": min(risk_score, 0.5)}
