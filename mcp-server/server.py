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
    verdict = data.get("verdict", "unknown")
    risk = data.get("risk", data.get("risk_score", data.get("score", "unknown")))
    findings = data.get("findings", data.get("results", data.get("issues", [])))
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


def tool_scan_jailbreak(text):
    result = call_module_scan(MODULE_JAILBREAK, {"text": text, "direction": "input"})
    audit_log("scan_jailbreak", text, result)
    return result


def tool_scan_code(target, code):
    result = call_module_scan(MODULE_VIBE, {"target": target, "code": code})
    audit_log("scan_code", target, result)
    return result


def tool_scan_dlp(text):
    result = call_module_scan(MODULE_DLP, {"text": text, "direction": "input"})
    audit_log("scan_dlp", text, result)
    return result


def tool_full_scan(target):
    result = call_full_scan(target)
    audit_log("full_scan", target, result)
    return result


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

    server.run()


if __name__ == "__main__":
    main()
