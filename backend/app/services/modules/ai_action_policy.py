import re
from app.services.feature_registry import register_feature


@register_feature(
    key="ai_action_policy_enforcer",
    name="AI Action Policy Enforcer",
    description="Monitor and enforce policies on AI agent actions in real-time. Detects goal hijacking, tool misuse, privilege escalation, data exfiltration, memory poisoning, and denial-of-wallet attacks.",
    tier="professional",
)
def ai_action_policy_enforcer(payload: dict) -> dict:
    action = payload.get("action", "")
    action_type = payload.get("action_type", "")
    agent_id = payload.get("agent_id", "unknown")
    policy = payload.get("policy", {})
    session_context = payload.get("session_context", {})
    tool_calls = payload.get("tool_calls", [])

    violations = []
    risk_score = 0.0
    abuse_categories = []

    allowed_actions = policy.get("allowed_actions", [])
    blocked_actions = policy.get("blocked_actions", [])
    allowed_targets = policy.get("allowed_targets", [])
    blocked_targets = policy.get("blocked_targets", [])
    max_tool_calls = policy.get("max_tool_calls_per_session", 100)
    max_cost = policy.get("max_cost_per_session", 10.0)
    sensitive_ops = policy.get("sensitive_operations", ["delete", "drop", "truncate", "sudo", "rm", "format", "kill", "terminate"])

    if action_type in blocked_actions:
        violations.append({"type": "blocked_action", "severity": "critical", "detail": f"Action '{action_type}' is blocked"})
        risk_score += 0.8
        abuse_categories.append("policy_violation")

    if allowed_actions and action_type not in allowed_actions:
        violations.append({"type": "unauthorized_action", "severity": "high", "detail": f"Action '{action_type}' not allowed"})
        risk_score += 0.6
        abuse_categories.append("excessive_autonomy")

    for target in payload.get("targets", []):
        if target in blocked_targets:
            violations.append({"type": "blocked_target", "severity": "critical", "detail": f"Target '{target}' blocked"})
            risk_score += 0.7
        if allowed_targets and target not in allowed_targets:
            violations.append({"type": "unauthorized_target", "severity": "high", "detail": f"Target '{target}' not allowed"})
            risk_score += 0.5

    for op in sensitive_ops:
        if op.lower() in action.lower():
            violations.append({"type": "sensitive_operation", "severity": "high", "detail": f"Sensitive op '{op}' detected"})
            risk_score += 0.4
            abuse_categories.append("tool_misuse")

    if _detect_goal_hijacking(action):
        violations.append({"type": "goal_hijacking", "severity": "critical", "detail": "Goal hijacking detected"})
        risk_score += 0.9
        abuse_categories.append("goal_hijacking")

    if _detect_exfiltration(action, tool_calls):
        violations.append({"type": "data_exfiltration", "severity": "critical", "detail": "Data exfiltration detected"})
        risk_score += 0.95
        abuse_categories.append("data_exfiltration")

    if _detect_privilege_escalation(action):
        violations.append({"type": "privilege_escalation", "severity": "critical", "detail": "Privilege escalation detected"})
        risk_score += 0.85
        abuse_categories.append("privilege_escalation")

    if _detect_memory_poisoning(action):
        violations.append({"type": "memory_poisoning", "severity": "high", "detail": "Memory poisoning detected"})
        risk_score += 0.7
        abuse_categories.append("memory_poisoning")

    if _detect_identity_spoofing(action):
        violations.append({"type": "identity_spoofing", "severity": "critical", "detail": "Identity spoofing detected"})
        risk_score += 0.9
        abuse_categories.append("identity_spoofing")

    if len(tool_calls) > max_tool_calls:
        violations.append({"type": "tool_limit", "severity": "medium", "detail": f"Tool calls ({len(tool_calls)}) exceed limit ({max_tool_calls})"})
        risk_score += 0.3
        abuse_categories.append("denial_of_wallet")

    total_cost = sum(tc.get("cost", 0) for tc in tool_calls)
    if total_cost > max_cost:
        violations.append({"type": "cost_limit", "severity": "high", "detail": "Cost exceeds limit"})
        risk_score += 0.5
        abuse_categories.append("denial_of_wallet")

    cred_result = _detect_credential_abuse(action, tool_calls)
    if cred_result["findings"]:
        violations.extend([{"type": "credential_abuse", "severity": "critical", "detail": f} for f in cred_result["findings"]])
        risk_score += cred_result["risk_score"]
        abuse_categories.append("credential_abuse")

    multi_result = _detect_multi_step_attack(session_context)
    if multi_result["findings"]:
        violations.extend([{"type": "multi_step_attack", "severity": "high", "detail": f} for f in multi_result["findings"]])
        risk_score += multi_result["risk_score"]
        abuse_categories.append("multi_step_attack")

    risk_score = min(risk_score, 1.0)
    allowed = len([v for v in violations if v["severity"] in ("critical", "high")]) == 0

    return {
        "agent_id": agent_id,
        "action": action[:200],
        "allowed": allowed,
        "risk_score": round(risk_score, 3),
        "violations": violations,
        "abuse_categories": list(set(abuse_categories)),
        "total_violations": len(violations),
        "critical_count": sum(1 for v in violations if v["severity"] == "critical"),
        "recommendation": "Action permitted." if allowed else "Action BLOCKED due to policy violations.",
    }


def _detect_goal_hijacking(action: str) -> bool:
    patterns = [
        r"(?:instead|actually|now|forget\s+that)\s*,?\s*(?:I\s+want|do|perform|execute|run|complete|accomplish|achieve|carry\s+out)",
        r"(?:change|modify|update|switch|redirect)\s+(?:the|your|my)\s+(?:goal|task|objective|mission|purpose|intent|target|plan|direction)",
        r"(?:your\s+new|the\s+new|from\s+now\s+on\s+the)\s+(?:goal|task|objective|mission|purpose|intent|target|plan)\s+(?:is|will\s+be|should\s+be)",
        r"(?:disregard|ignore|abandon|drop|stop|cease)\s+(?:the|your|previous|original|current|initial)\s+(?:goal|task|objective|mission|purpose|intent|target|plan)",
    ]
    return any(re.search(p, action, re.IGNORECASE) for p in patterns)


def _detect_exfiltration(action: str, tool_calls: list) -> bool:
    patterns = [
        r"(?:send|transmit|transfer|forward|post|push|upload|export|deliver|dispatch|route)\s+(?:the|all|every|each|user|customer|client|sensitive|confidential|private|secret)\s+(?:data|information|record|file|database|account|content)\s+(?:to|at|into|via|through|using)",
        r"(?:exfiltrate|leak|extract|steal|smuggle)\s+(?:data|information|credentials|secrets|keys|tokens|passwords|records|files|database)",
        r"(?:webhook|callback|endpoint|server)\s*[:=]\s*[\"']?https?://(?!(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.))",
    ]
    if any(re.search(p, action, re.IGNORECASE) for p in patterns):
        return True
    for tc in tool_calls:
        tc_str = str(tc)
        if re.search(r"(?:http|https|webhook|callback)\s*[:=]\s*[\"']?https?://(?!(?:localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.))", tc_str, re.IGNORECASE):
            return True
    return False


def _detect_privilege_escalation(action: str) -> bool:
    patterns = [
        r"(?:grant|give|assign|provide|add|set|elevate|promote|upgrade)\s+(?:me|the\s+user|this\s+session|my\s+account|the\s+agent)\s+(?:admin|administrator|root|superuser|owner|elevated|full|all|unrestricted|unlimited|privileged)\s+(?:access|permission|privilege|role|rights?|authority|level|status)",
        r"(?:escalate|elevate|raise|increase|boost|upgrade)\s+(?:privilege|permission|role|level|access|authority|status)",
        r"(?:bypass|circumvent|skip|override|disable|deactivate|turn\s*off|ignore)\s+(?:the|any|all|role|permission|access|auth|security|verification|validation|check|restriction|control|policy|rule|guardrail)",
    ]
    return any(re.search(p, action, re.IGNORECASE) for p in patterns)


def _detect_memory_poisoning(action: str) -> bool:
    patterns = [
        r"(?:remember|store|save|keep|memorize|note|record|write|persist|cache)\s+(?:that|the\s+following|this|always|from\s+now\s+on|for\s+(?:all|every|future|subsequent|later|upcoming)\s+(?:session|interaction|conversation|request))",
        r"(?:update|modify|change|edit|alter|replace|overwrite)\s+(?:your|the|my)\s+(?:memory|context|knowledge|understanding|belief|state|setting|preference|behavior|persona|role)",
        r"(?:inject|insert|add|plant|embed|include)\s+(?:a|the|this|malicious|harmful|unauthorized|fake|false|incorrect|misleading|poisoned)\s+(?:instruction|command|rule|knowledge|information|data|belief|memory)",
    ]
    return any(re.search(p, action, re.IGNORECASE) for p in patterns)


def _detect_identity_spoofing(action: str) -> bool:
    patterns = [
        r"(?:pretend|act|behave|pose|impersonate|masquerade|represent)\s+(?:to\s+be|as|like)\s+(?:a|an|the|another|different|other)\s+(?:admin|administrator|developer|engineer|owner|creator|manager|executive|director|CTO|CEO|system|root|superuser|agent|service|bot|AI|assistant)",
        r"(?:I\s+am|this\s+is)\s+(?:a|an|the)\s+(?:admin|administrator|developer|engineer|owner|manager|executive|director|CTO|CEO|system|root|superuser|agent)",
        r"(?:authenticate|log\s*in|sign\s*in|login)\s+(?:as|to)\s+(?:admin|administrator|root|superuser|system|owner|manager|executive|director|CTO|CEO)",
    ]
    return any(re.search(p, action, re.IGNORECASE) for p in patterns)


def _detect_credential_abuse(action: str, tool_calls: list) -> dict:
    findings = []
    risk_score = 0.0

    cred_patterns = [
        r"(?:access|read|get|retrieve|fetch|obtain|extract|steal|exfiltrate|leak|copy|duplicate|harvest|scrape|collect|gather)\s+(?:the\s+)?(?:secret|token|key|password|credential|api[_-]?key|auth|bearer|jwt|session|oauth|access[_-]?token|refresh[_-]?token|private[_-]?key|ssh[_-]?key|certificate)",
        r"(?:use|leak|expose|share|transmit|send|forward|post|upload|export|dump|reveal|disclose)\s+(?:the\s+)?(?:secret|token|key|password|credential|api[_-]?key|auth|bearer|jwt|session|oauth)",
        r"(?:escalate|elevate|raise|increase)\s+(?:privilege|permission|role|scope|access|rights?|authority|level|status)\s+(?:to|using|via|by|through)",
    ]

    for pattern in cred_patterns:
        if re.search(pattern, action, re.IGNORECASE):
            findings.append(f"Credential abuse pattern detected: {pattern[:50]}...")
            risk_score += 0.4
            break

    for tc in tool_calls:
        tc_str = str(tc)
        if re.search(r"(?:secret|token|key|password|credential|api[_-]?key|auth|bearer|jwt)", tc_str, re.IGNORECASE):
            if re.search(r"(?:send|post|upload|export|forward|transmit|leak|exfil|share|reveal)", tc_str, re.IGNORECASE):
                findings.append(f"Suspicious credential access in tool call: {tc.get('tool_name', 'unknown')}")
                risk_score += 0.5
                break

    return {"findings": findings, "risk_score": min(risk_score, 0.8)}


def _detect_multi_step_attack(session_context: dict) -> dict:
    findings = []
    risk_score = 0.0

    history = session_context.get("action_history", [])
    if len(history) >= 3:
        sensitive_access = [h for h in history if h.get("sensitive", False)]
        external_actions = [h for h in history if h.get("external", False)]

        if len(sensitive_access) >= 2 and len(external_actions) >= 1:
            findings.append(f"Multi-step exfiltration pattern: {len(sensitive_access)} sensitive accesses followed by {len(external_actions)} external actions")
            risk_score += 0.6

    if len(history) >= 5:
        escalating = True
        for i in range(1, len(history)):
            if history[i].get("risk_level", 0) < history[i-1].get("risk_level", 0):
                escalating = False
                break
        if escalating:
            findings.append("Escalating action sequence detected - possible incremental attack")
            risk_score += 0.4

    return {"findings": findings, "risk_score": min(risk_score, 0.7)}
