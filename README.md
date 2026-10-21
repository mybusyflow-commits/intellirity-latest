# Intellirity - AI Security Platform

Screens prompts, code and agent actions for injection, jailbreak, exfiltration,
leak and spend-abuse risk before they reach a model — then proves what it did
with a hash-chained audit ledger, proof-of-intent certificates and escrow.

## Getting Started

1. **Backend** (port 8000):

   ```bash
   cd backend
   pip install -e .            # or: poetry install
   uvicorn app.main:app --reload --port 8000
   ```

   Optional `.env` in `backend/`:

   ```ini
   DATABASE_URL=postgresql+asyncpg://...     # optional; memory mode without it
   OPENCODEZEN_API_KEY=...                    # LLM reasoning + reverse proxy upstream
   OPENCODEZEN_BASE_URL=https://opencode.ai/zen/v1
   OPENCODEZEN_MODEL=...                      # optional; auto-discovered when empty
   SECRET_KEY=...                             # app secret
   VPI_SIGNING_KEY=...                        # proof-of-intent signing key
   CLERK_SECRET_KEY=...                       # unset = open mode (no auth)
   ALLOWED_ORIGINS=https://your-app.example
   BILLING_ENFORCED=false
   ```

2. **Frontend** (port 3000):

   ```bash
   cd Intellirity-Frontend
   npm install
   npm run dev
   ```

   The Next server proxies `/backend/*` to the API. Point it somewhere else
   with `BACKEND_INTERNAL_URL` (defaults to `http://127.0.0.1:8000/api/v1`).

3. **Or with Docker**: `docker-compose up --build` (Postgres + backend + frontend).

4. **API docs**: http://localhost:8000/docs

## Surfaces

| Surface | Path | What it is |
|---|---|---|
| Console | `Intellirity-Frontend/` | Next.js 16 app: overview, scanner, verdicts, leakage, anomalies, proof, flow, content, behavior, intel, wallet, models, policies, escrow, audit |
| Python SDK | `sdk/python` | `from intellirity import Shield` — every module plus the trust machinery |
| JS SDK | `sdk/js` | `import { Shield } from "@intellirity/shield"` — same surface + `proxyChat` |
| MCP server | `mcp-server/` | 15 tools over stdio (Claude Desktop, MCP Inspector) |
| Chrome extension | `extension/` | MV3 popup that screens a pasted prompt against the live engine |
| Sidecar | `docker-compose.sidecar.yml` | Screened engine beside your workload in the VPC |

## Architecture

```
intellirity/
├── backend/                    # FastAPI + SQLAlchemy (async) + Neon-ready
│   └── app/
│       ├── api/v1/             # users, orgs, scans, threats, modules, system,
│       │                       # reasoning, realtime, jobs, billing, proxy, workspace
│       ├── core/               # config, JWT verify, rate limits
│       ├── db/                 # session + best-effort persistence
│       ├── models/             # SQLAlchemy models
│       ├── schemas/            # Pydantic v2 schemas
│       └── services/
│           ├── modules/        # the 16 detection engines (the "brain")
│           ├── code_analyzer.py, reasoning.py, realtime.py, jobs.py, billing.py
│           └── feature_registry.py
├── Intellirity-Frontend/       # Next.js 16 app router (the product UI)
├── sdk/{python,js}             # client SDKs
├── mcp-server/                 # MCP stdio server
├── extension/                  # Chrome MV3 extension
├── webapp/                     # legacy static marketing site
├── src/                        # legacy Vite app
└── api/index.py                # Vercel (Mangum) serverless entrypoint
```

## Detection engines (16)

jailbreak/injection · vibe-code security · AI action policy · data flow
tracking · workflow anomaly · proof of intent · black-box ledger · autonomous
escrow · model supply chain · advanced threat intel · behavioural analysis ·
MCP security monitor · denial-of-wallet · DLP · content moderation · threat
intel feed.

Every engine is a real deterministic analyser (regex/statistical/state-machine)
— no LLM call, no canned verdict. The LLM is used only where a language
model is genuinely required (reasoning endpoint, reverse proxy upstream).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `OPENCODEZEN_API_KEY` | backend | Upstream LLM key for reasoning + proxy |
| `OPENCODEZEN_BASE_URL` | backend | Any OpenAI-compatible gateway |
| `OPENCODEZEN_MODEL` | backend | Pin a model (auto-discovered otherwise) |
| `BACKEND_INTERNAL_URL` | frontend | Where `/backend/*` proxies to |
| `CLERK_SECRET_KEY` | backend | Enables Clerk session auth; unset = open mode (dev) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | frontend | Clerk UI |
| `INTELLIRITY_API_KEYS` | backend | Machine keys for SDK/MCP, comma separated (dev) |
| `INTELLIRITY_API_KEY_HASHES` | backend | SHA-256 hex of each machine key (production) |
| `VPI_SIGNING_KEY` | backend | HMAC key for proof-of-intent certs |
| `BILLING_ENFORCED` | backend | `true` enforces plan entitlements |
| `TURNSTILE_SECRET` | backend | Cloudflare Turnstile on the contact form |
| `INTELLIRITY_BASE_URL` / `INTELLIRITY_API_KEY` | SDK/MCP | Client targeting |

## Authentication

Two independent identity paths, both enforced by `require_user`:

1. **Humans** — `Authorization: Bearer <Clerk session JWT>`. Verified by
   RS256 against the Clerk JWKS (cached 1h) or HS256 with
   `CLERK_SECRET_KEY`. The JWT payload is the identity (`sub`, email, org).
2. **Machines** — `X-API-Key: <key>`, used by the Python/JS SDKs and the MCP
   server. Keys are matched by SHA-256, so the stored value is not the
   secret. A machine key gets a stable service identity
   (`sub: apikey:<fingerprint>`) and owns its own workspace, orgs and
   billing — it is never written to the `users` table.

Failure behaviour is deliberate:

| Situation | Result |
|---|---|
| No credentials, no auth configured (dev) | 200, open mode, identity `local-dev` |
| Invalid `X-API-Key` | 401 (never silently anonymous) |
| Bearer token present but `CLERK_SECRET_KEY` unset | 503 (loud misconfiguration) |
| No auth configured and `ENVIRONMENT=production` | 503 (never open in prod) |
| Expired / forged / unsigned JWT | 401 |

## Security notes

- Screening **fails closed**: if an engine errors, the proxy denies the
  request rather than passing it through unscreened.
- Proof-of-intent certificates are **HMAC-SHA256 signed**; forged or expired
  certificates are rejected.
- The threat feed labels every row `detection` / `synthetic` / `sample`, and
  headline metrics count only real detections.
- `.env` files hold live credentials — keep them out of git and rotate keys
  that have been committed or shared.
