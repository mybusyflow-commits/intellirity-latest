# Intellirity MCP Server

MCP server that exposes live Intellirity backend scans as tools.
Default base URL is `http://localhost:8000`, set via `INTELLIRITY_BASE_URL`.
Optional API key via `INTELLIRITY_API_KEY`. No secrets are hardcoded.

## Tools

- `scan_jailbreak(text)`: scan text for injection risk.
- `scan_code(target, code)`: scan code for security issues.
- `scan_dlp(text)`: scan text for data loss risk.
- `full_scan(target)`: run a multi module scan.

Each tool returns compact text: `verdict` plus `risk` plus top findings.
Every call is logged to stderr with timestamp, tool name, input preview,
and verdict. Stdout is reserved for the MCP stdio transport.

## Claude Desktop config

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "intellirity": {
      "command": "python",
      "args": ["C:/Users/techt/OneDrive/Desktop/intelirity/2.0/intelsec/mcp-server/server.py"],
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
3. Open List Tools and verify `scan_jailbreak`, `scan_code`, `scan_dlp`,
   and `full_scan` appear.
4. Run `scan_jailbreak` with `{"text": "hello world"}` and check the
   compact verdict text.
5. Check the server logs on stderr for the audit entry.

## Local run

```bash
pip install -r requirements.txt
python server.py
```
