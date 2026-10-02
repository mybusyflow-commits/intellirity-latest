"""Intellirity MCP server.

Exposes live backend scans as MCP tools. Transport is stdio.
Audit trail goes to stderr only, never stdout.
"""

import json
import os
import sys
import traceback
from datetime import datetime, timezone

import httpx

BASE_URL_DEFAULT = "http://localhost:8000"
TIMEOUT_SECONDS = 10.0

MODULE_JAILBREAK = "jailbreak_injection_protection"
MODULE_VIBE = "vibe_code_security"
MODULE_DLP = "data_loss_prevention"


def get_base_url():
    return os.environ.get("INTELLIRITY_BASE_URL", BASE_URL_DEFAULT).rstrip("/")


def get_headers():
    headers = {"Content-Type": "application/json"}
    api_key = os.environ.get("INTELLIRITY_API_KEY")
    if api_key:
        headers["X-API-Key"] = api_key
    return headers


def audit_log(tool, input_preview, verdict):
    ts = datetime.now(timezone.utc).isoformat()
    preview = str(input_preview)[:200].replace("\n", " ")
    entry = {
        "timestamp": ts,
        "tool": tool,
        "input_preview": preview,
        "verdict": str(verdict),
    }
    print(json.dumps(entry), file=sys.stderr, flush=True)


def format_compact(data):
    if not isinstance(data, dict):
        return "verdict=unknown risk=unknown findings=%s" % str(data)[:500]
    # Module scans nest the payload under "result"; full scans use top level.
    inner = data.get("result") if isinstance(data.get("result"), dict) else data
    data = inner
    if "allowed" in data:
        verdict = "allow" if data.get("allowed") else "deny"
    elif data.get("verdict") not in (None, ""):
        verdict = data.get("verdict")
    elif isinstance(data.get("certificate"), dict):
        verification = data.get("action_verification") or {}
        verdict = "approved" if verification.get("approved") else "issued"
    elif isinstance(data.get("threats"), list):
        verdict = "feed:%d" % len(data.get("threats"))
    else:
        act = data.get("action", data.get("status", "unknown"))
        verdict = act if act in (
            "block", "flag", "allow", "deny", "monitor", "throttle",
            "redact", "log", "clean", "warning", "critical", "suspicious",
        ) else "unknown"
    risk = data.get("risk", data.get("risk_score", data.get("score", "unknown")))
    findings = data.get("findings", data.get("results", data.get("issues", data.get("threats", []))))
    if isinstance(findings, dict):
        findings = [findings]
    top = []
    if isinstance(findings, list):
        for item in findings[:3]:
            if isinstance(item, dict):
                label = item.get("title", item.get("name", item.get("type", "finding")))
                top.append("%s" % label)
            else:
                top.append("%s" % str(item)[:120])
    top_str = "; ".join(top) if top else "none"
    return "verdict=%s risk=%s top_findings=%s" % (verdict, risk, top_str)


def call_module_scan(key, payload):
    url = get_base_url() + "/api/v1/modules/" + key + "/scan"
    try:
        resp = httpx.post(
            url, json=payload, headers=get_headers(), timeout=TIMEOUT_SECONDS
        )
    except Exception as exc:
        return "error: request failed: %s" % exc
    if resp.status_code == 403:
        return "error: 403 Forbidden, plan lacks this feature, upgrade required."
    if resp.status_code >= 400:
        return "error: status %s: %s" % (resp.status_code, resp.text[:500])
    try:
        data = resp.json()
    except Exception:
        return "error: invalid JSON response: %s" % resp.text[:500]
    return format_compact(data)


def call_full_scan(target, modules=None):
    if modules is None:
        modules = [MODULE_JAILBREAK, MODULE_VIBE, MODULE_DLP]
    url = get_base_url() + "/api/v1/scans/run"
    payload = {"text": target, "target": target, "modules": modules}
    try:
        resp = httpx.post(
            url, json=payload, headers=get_headers(), timeout=TIMEOUT_SECONDS
        )
    except Exception as exc:
        return "error: request failed: %s" % exc
    if resp.status_code == 403:
        return "error: 403 Forbidden, plan lacks this feature, upgrade required."
    if resp.status_code >= 400:
        return "error: status %s: %s" % (resp.status_code, resp.text[:500])
    try:
        data = resp.json()
    except Exception:
        return "error: invalid JSON response: %s" % resp.text[:500]
    return format_compact(data)


def _tool(key, name, payload, preview):
    result = call_module_scan(key, payload)
    audit_log(name, preview, result)
    return result


def tool_scan_jailbreak(text):
    return _tool(MODULE_JAILBREAK, "scan_jailbreak", {"text": text, "direction": "input"}, text)


def tool_scan_code(target, code):
    return _tool(MODULE_VIBE, "scan_code", {"target": target, "code": code, "target_type": "code"}, target)


def tool_scan_dlp(text):
    return _tool(MODULE_DLP, "scan_dlp", {"text": text, "direction": "input"}, text)


def tool_full_scan(target):
    result = call_full_scan(target)
    audit_log("full_scan", target, result)
    return result


def tool_moderate(text):
    return _tool("content_moderation", "moderate", {"text": text, "direction": "input"}, text)


def tool_check_action(action, agent_id="mcp-agent"):
    return _tool("ai_action_policy_enforcer", "check_action",
                 {"action": action, "agent_id": agent_id}, action)


def tool_track_flow(data_id, destinations, classification="internal"):
    stages = [{"destination": d} for d in (destinations or [])]
    return _tool("data_flow_tracker", "track_flow",
                 {"data_id": data_id, "pipeline_stages": stages,
                  "data_classification": classification}, data_id)


def tool_audit_wallet(session_id, total_tokens=0):
    return _tool("denial_of_wallet_protector", "audit_wallet",
                 {"session_id": session_id, "token_usage": {"total": total_tokens},
                  "api_calls": []}, session_id)


def tool_verify_supply(model_source, model_format="unknown"):
    return _tool("model_supply_chain_security", "verify_supply",
                 {"model_source": model_source, "model_format": model_format}, model_source)


def tool_issue_intent(human_id, instruction):
    return _tool("verifiable_proof_of_intent", "issue_intent",
                 {"human_id": human_id, "instruction": instruction,
                  "action_scope": []}, instruction)


def tool_score_workflow(actions):
    items = [{"type": a} for a in (actions or [])]
    return _tool("workflow_anomaly_detector", "score_workflow",
                 {"workflow_id": "mcp", "actions": items}, ",".join(actions or []))


def tool_threat_intel(limit=5):
    return _tool("threat_intelligence_feed", "threat_intel",
                 {"type": "all", "limit": limit}, "feed")


def tool_escrow(agent_id, amount):
    return _tool("autonomous_escrow", "escrow_create",
                 {"action": "create", "agent_id": agent_id, "amount": amount},
                 "%s %s" % (agent_id, amount))


TOOL_DEFS = {
    "scan_jailbreak": {
        "description": "Scan text for injection and jailbreak risk.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    "scan_code": {
        "description": "Scan code for security issues.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "target": {"type": "string"},
                "code": {"type": "string"},
            },
            "required": ["target", "code"],
        },
    },
    "scan_dlp": {
        "description": "Scan text for data loss risk.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    "full_scan": {
        "description": "Run a full multi module scan.",
        "inputSchema": {
            "type": "object",
            "properties": {"target": {"type": "string"}},
            "required": ["target"],
        },
    },
    "moderate": {
        "description": "Score text with content moderation (spam, abuse, violence, self-harm, hate).",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    "check_action": {
        "description": "Test an agent action against the policy enforcer.",
        "inputSchema": {
            "type": "object",
            "properties": {"action": {"type": "string"}, "agent_id": {"type": "string"}},
            "required": ["action"],
        },
    },
    "track_flow": {
        "description": "Trace a data pipeline across destination hops.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "data_id": {"type": "string"},
                "destinations": {"type": "array", "items": {"type": "string"}},
                "classification": {"type": "string"},
            },
            "required": ["data_id", "destinations"],
        },
    },
    "audit_wallet": {
        "description": "Audit an AI spend session for runaway budgets.",
        "inputSchema": {
            "type": "object",
            "properties": {"session_id": {"type": "string"}, "total_tokens": {"type": "number"}},
            "required": ["session_id"],
        },
    },
    "verify_supply": {
        "description": "Verify a model source for poisoning and unsafe formats.",
        "inputSchema": {
            "type": "object",
            "properties": {"model_source": {"type": "string"}, "model_format": {"type": "string"}},
            "required": ["model_source"],
        },
    },
    "issue_intent": {
        "description": "Issue a signed proof-of-intent certificate for a human instruction.",
        "inputSchema": {
            "type": "object",
            "properties": {"human_id": {"type": "string"}, "instruction": {"type": "string"}},
            "required": ["human_id", "instruction"],
        },
    },
    "score_workflow": {
        "description": "Detect loops and anomalies in a workflow action sequence.",
        "inputSchema": {
            "type": "object",
            "properties": {"actions": {"type": "array", "items": {"type": "string"}}},
            "required": ["actions"],
        },
    },
    "threat_intel": {
        "description": "Query the live threat intelligence feed.",
        "inputSchema": {
            "type": "object",
            "properties": {"limit": {"type": "number"}},
        },
    },
    "escrow_create": {
        "description": "Hold value in autonomous escrow pending human review.",
        "inputSchema": {
            "type": "object",
            "properties": {"agent_id": {"type": "string"}, "amount": {"type": "number"}},
            "required": ["agent_id", "amount"],
        },
    },
}


def dispatch_tool(name, args):
    args = args or {}
    if name == "scan_jailbreak":
        return tool_scan_jailbreak(args.get("text", ""))
    if name == "scan_code":
        return tool_scan_code(args.get("target", ""), args.get("code", ""))
    if name == "scan_dlp":
        return tool_scan_dlp(args.get("text", ""))
    if name == "full_scan":
        return tool_full_scan(args.get("target", ""))
    if name == "moderate":
        return tool_moderate(args.get("text", ""))
    if name == "check_action":
        return tool_check_action(args.get("action", ""), args.get("agent_id", "mcp-agent"))
    if name == "track_flow":
        return tool_track_flow(args.get("data_id", ""), args.get("destinations", []),
                               args.get("classification", "internal"))
    if name == "audit_wallet":
        return tool_audit_wallet(args.get("session_id", ""), args.get("total_tokens", 0))
    if name == "verify_supply":
        return tool_verify_supply(args.get("model_source", ""), args.get("model_format", "unknown"))
    if name == "issue_intent":
        return tool_issue_intent(args.get("human_id", ""), args.get("instruction", ""))
    if name == "score_workflow":
        return tool_score_workflow(args.get("actions", []))
    if name == "threat_intel":
        return tool_threat_intel(args.get("limit", 5))
    if name == "escrow_create":
        return tool_escrow(args.get("agent_id", ""), args.get("amount", 0))
    raise ValueError("unknown tool: %s" % name)


# Fallback: plain stdio JSON-RPC used only when the mcp package is not installed.
# The FastMCP path below is preferred. This fallback keeps stdio behavior
# compatible for minimal list and call handling without extra dependencies.
def run_stdio_fallback():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except Exception:
            continue
        msg_id = msg.get("id")
        method = msg.get("method", "")
        params = msg.get("params", {})

        def send(result=None, error=None):
            out = {"jsonrpc": "2.0", "id": msg_id}
            if error is not None:
                out["error"] = error
            else:
                out["result"] = result
            sys.stdout.write(json.dumps(out) + "\n")
            sys.stdout.flush()

        try:
            if method == "initialize":
                send({"protocolVersion": "2024-11-05", "serverInfo": {"name": "intellirity", "version": "0.1.0"}})
            elif method == "tools/list":
                send({"tools": [{"name": k, **v} for k, v in TOOL_DEFS.items()]})
            elif method == "tools/call":
                tool_name = params.get("name", "")
                tool_args = params.get("arguments", {})
                text_result = dispatch_tool(tool_name, tool_args)
                send({"content": [{"type": "text", "text": text_result}]})
            else:
                send(error={"code": -32601, "message": "method not found: %s" % method})
        except Exception as exc:
            traceback.print_exc(file=sys.stderr)
            send(error={"code": -32603, "message": "%s" % exc})


def main():
    try:
        from mcp.server.fastmcp import FastMCP
    except Exception:
        run_stdio_fallback()
        return

    server = FastMCP("intellirity")

    @server.tool()
    def scan_jailbreak(text: str) -> str:
        """Scan text for injection and jailbreak risk."""
        return tool_scan_jailbreak(text)

    @server.tool()
    def scan_code(target: str, code: str) -> str:
        """Scan code for security issues."""
        return tool_scan_code(target, code)

    @server.tool()
    def scan_dlp(text: str) -> str:
        """Scan text for data loss risk."""
        return tool_scan_dlp(text)

    @server.tool()
    def full_scan(target: str) -> str:
        """Run a full multi module scan."""
        return tool_full_scan(target)

    @server.tool()
    def moderate(text: str) -> str:
        """Score text with content moderation."""
        return tool_moderate(text)

    @server.tool()
    def check_action(action: str, agent_id: str = "mcp-agent") -> str:
        """Test an agent action against the policy enforcer."""
        return tool_check_action(action, agent_id)

    @server.tool()
    def track_flow(data_id: str, destinations: list, classification: str = "internal") -> str:
        """Trace a data pipeline across destination hops."""
        return tool_track_flow(data_id, destinations, classification)

    @server.tool()
    def audit_wallet(session_id: str, total_tokens: float = 0) -> str:
        """Audit an AI spend session for runaway budgets."""
        return tool_audit_wallet(session_id, total_tokens)

    @server.tool()
    def verify_supply(model_source: str, model_format: str = "unknown") -> str:
        """Verify a model source for poisoning and unsafe formats."""
        return tool_verify_supply(model_source, model_format)

    @server.tool()
    def issue_intent(human_id: str, instruction: str) -> str:
        """Issue a signed proof-of-intent certificate."""
        return tool_issue_intent(human_id, instruction)

    @server.tool()
    def score_workflow(actions: list) -> str:
        """Detect loops and anomalies in a workflow action sequence."""
        return tool_score_workflow(actions)

    @server.tool()
    def threat_intel(limit: int = 5) -> str:
        """Query the live threat intelligence feed."""
        return tool_threat_intel(limit)

    @server.tool()
    def escrow_create(agent_id: str, amount: float) -> str:
        """Hold value in autonomous escrow pending human review."""
        return tool_escrow(agent_id, amount)

    server.run()


if __name__ == "__main__":
    main()
