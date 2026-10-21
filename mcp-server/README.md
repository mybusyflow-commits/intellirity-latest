# Intellirity MCP Server

MCP server that exposes live Intellirity backend scans as tools.
Default base URL is `http://localhost:8000`, set via `INTELLIRITY_BASE_URL`.
Optional API key via `INTELLIRITY_API_KEY`. No secrets are hardcoded.

## Tools (15)

Scanning
- `scan_jailbreak(text)`: scan text for injection risk.
- `scan_code(target, code)`: scan code for security issues.
- `scan_dlp(text)`: scan text for data loss risk.
- `full_scan(target)`: run a multi module scan.
- `moderate(text)`: score text with content moderation.

Agent behaviour
- `check_action(action, agent_id)`: test an agent action against the policy enforcer.
- `track_flow(data_id, destinations, classification)`: trace a data pipeline across hops.
- `audit_wallet(session_id, total_tokens)`: audit an AI spend session for runaway budgets.
- `score_workflow(actions)`: detect loops and anomalies in a workflow action sequence.

Trust machinery
- `verify_supply(model_source, model_format)`: verify a model source for poisoning and unsafe formats.
- `issue_intent(human_id, instruction)`: issue a signed proof-of-intent certificate.
- `escrow_create(agent_id, amount)`: hold value in autonomous escrow pending review.
- `ledger_log(ai_decision, prompt, action_taken, confidence_score)`: append a sealed, hash-chained audit record.
- `ledger_verify()`: verify the integrity of the audit ledger hash chain.

Intel
- `threat_intel(limit)`: query the live threat intelligence feed.

Each tool returns compact text: `verdict` plus `risk` plus top findings.
Every call is logged to stderr with timestamp, tool name, input preview,
and verdict. Stdout is reserved for the MCP stdio transport.

## Claude Desktop config

Add this to `claude_desktop_config.json` (use the path where this repo
actually lives — copy it from your machine):

```json
{
  "mcpServers": {
    "intellirity": {
      "command": "python",
      "args": ["C:/Users/techt/OneDrive/Desktop/intelirity/2.0/intellirity final/mcp-server/server.py"],
      "env": {
        "INTELLIRITY_BASE_URL": "http://localhost:8000"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

## Inspector steps

```bash
pip install -r requirements.txt
npx @modelcontextprotocol/inspector python server.py
```

Then in the Inspector UI:

1. Select stdio transport and confirm the command above.
2. Click Connect.
3. Open List Tools and verify the 15 tools above appear.
4. Run `scan_jailbreak` with `{"text": "hello world"}` and check the
   compact verdict text.
5. Check the server logs on stderr for the audit entry.

## Local run

```bash
pip install -r requirements.txt
python server.py
```
