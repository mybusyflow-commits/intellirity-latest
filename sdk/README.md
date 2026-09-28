# Intellirity Python SDK

Client for the Intellirity API. Default base URL is `http://localhost:8000`.

## Install

```bash
pip install -e .
```

## Quickstart

```python
from intellirity import Shield
shield = Shield()
result = shield.check_jailbreak("hello world")
print(result.get("verdict"))
```

The snippet above creates a client, scans one prompt, and prints the verdict.

With an API key:

```python
from intellirity import Shield
shield = Shield(api_key="YOUR_KEY")
print(shield.check_dlp("hello world"))
```

## Verdict meanings

- `allow`: input looks safe, no action needed.
- `flag`: input looks suspicious, review recommended.
- `block`: input looks unsafe, do not proceed.

 actual payloads also include risk scores and findings lists. Use
 `verdict` for decisions and `findings` for details.

## Error codes

- `403`: raised as `PermissionError` with an upgrade hint. The active plan
  lacks that feature.
- `4xx / 5xx`: raised as `RuntimeError` with the response body included.
- Transport errors (timeout, DNS, connection): raised as `RuntimeError`.

All requests use a 10 second timeout. The `X-API-Key` header is sent only
when `api_key` is set.
