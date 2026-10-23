# Deployment

Three supported shapes. Pick one; all three run the same engine.

---

## 1. Vercel (the console + the API in one project)

The Next.js console and the FastAPI engine deploy as one Vercel project:
the console is a Next.js app, the engine is a Python serverless function
at `api/index.py`, and `vercel.json` routes `/backend/*` to it.

### Project settings

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root directory | repository root |
| Install command | `npm --prefix Intellirity-Frontend install` |
| Build command | `npm --prefix Intellirity-Frontend run build` |
| Output directory | `Intellirity-Frontend/.next` |
| Node version | 20 or newer |

`vercel.json` already carries these; they are listed here so you can check
them in the dashboard.

### Environment variables (Vercel → Settings → Environment Variables)

**Production** (available to the serverless function and the build):

```
DATABASE_URL=postgresql+asyncpg://...      # Neon/Supabase pooler URL
SECRET_KEY=<long random string>            # required; the default is refused
VPI_SIGNING_KEY=<long random string>       # required in production
CLERK_SECRET_KEY=sk_live_...               # required in production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_GATEWAY_URL=https://your-domain.com
NEXT_PUBLIC_DEPLOY_ENV=production
ALLOWED_ORIGINS=https://your-domain.com
ENVIRONMENT=production
```

**Optional:**

```
OPENCODEZEN_API_KEY=...                    # LLM reasoning + reverse proxy upstream
TURNSTILE_SECRET=...                       # required for the public contact form
BILLING_ENFORCED=true                      # enforce plan entitlements
INTELLIRITY_API_KEY_HASHES=<sha256,...>    # machine keys for the SDKs and MCP
LOG_JSON=true
```

### What the production posture does

`ENVIRONMENT=production` turns on the fail-closed rules:

- The engine **refuses to start** if there is no auth configured, if
  `SECRET_KEY` is still the default, or if `VPI_SIGNING_KEY` is unset.
- The console returns **503** rather than rendering an unauthenticated
  shell, if `CLERK_SECRET_KEY` is missing.
- The public contact form **refuses** submissions if `TURNSTILE_SECRET` is
  missing, instead of accepting spam.
- The reverse proxy **denies** a request when a screening engine errors.
- HTTP is redirected to HTTPS by default.

### After the first deploy

1. **Point the domain.** Set `NEXT_PUBLIC_SITE_URL` to the final origin and
   redeploy — every canonical tag, the sitemap, robots.txt and the
   structured data derive from it.
2. **Run the database migration.** The engine adds the ledger's sequence
   column on boot automatically. If you have a ledger written by an older
   build, repair the chain once:
   `python scripts/repair_ledger_chain.py`
3. **Verify Clerk.** Add your production domain to Clerk's allowed
   origins, and set the publishable key in Vercel.
4. **Check the crawl surface.** `/robots.txt` and `/sitemap.xml` are
   generated from the route registry; `/llms.txt` and `/llms-full.txt`
   describe the product for answer engines.

---

## 2. Docker Compose (whole stack, one host)

```bash
cp .env.example .env          # fill in the secrets
docker compose up --build
```

- Postgres 16, the FastAPI engine on `:8000`, the Next console on `:3000`.
- The console reaches the engine through the internal `backend` service.
- `ENVIRONMENT` defaults to `development`; set it to `production` and
  provide every secret before exposing this to the internet.

---

## 3. VPC sidecar (the engine beside your workload)

```bash
docker compose -f docker-compose.sidecar.yml up --build
```

The screening engine runs inside your network. Your application sends
prompts to `http://intellirity:8000` and gets a verdict; prompts never
leave the VPC. This is the "sovereign" deployment the security model page
describes.

---

## Environment variable reference

### Engine (`backend/.env`)

| Variable | Required in production | Purpose |
|---|---|---|
| `DATABASE_URL` | recommended | Postgres. Blank = memory-only (state lost on restart) |
| `SECRET_KEY` | **yes** | App secret. The default value is refused |
| `VPI_SIGNING_KEY` | **yes** | HMAC key for proof-of-intent certificates |
| `CLERK_SECRET_KEY` | **yes** | Enables session auth for humans |
| `INTELLIRITY_API_KEY_HASHES` | one of the two | Machine keys (SDKs, MCP server) |
| `INTELLIRITY_API_KEYS` | no | Raw machine keys — development only |
| `ALLOWED_ORIGINS` | **yes** | Comma-separated. Never `*` |
| `ENVIRONMENT` | **yes** | `production` enables the fail-closed rules |
| `OPENCODEZEN_API_KEY` | optional | LLM upstream for reasoning and the proxy |
| `OPENCODEZEN_BASE_URL` | optional | Any OpenAI-compatible gateway |
| `TURNSTILE_SECRET` | recommended | Spam protection for the contact form |
| `BILLING_ENFORCED` | optional | `true` enforces plan entitlements |
| `LOG_JSON` | optional | Structured JSON logs |

### Console (`Intellirity-Frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Enables the Clerk UI |
| `CLERK_SECRET_KEY` | Enables route protection on `/console` |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for SEO and structured data |
| `NEXT_PUBLIC_GATEWAY_URL` | Your gateway origin, shown in the integration snippet |
| `BACKEND_INTERNAL_URL` | Where `/backend/*` proxies to |
| `NEXT_PUBLIC_DEPLOY_ENV` | Label shown in the console chrome |
| `SECURE_REDIRECT` | HTTPS redirect. On by default in production |
| `NEXT_PUBLIC_GA_ID` | Analytics. Loads only after the visitor accepts |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Contact-form spam protection |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console token |

---

## Identity model

Two independent paths, both enforced by `require_user`:

1. **Humans** — `Authorization: Bearer <Clerk session JWT>`. Verified by
   RS256 against the Clerk JWKS, or HS256 with `SECRET_KEY`. The token's
   `org_id` decides the tenant: a member of a Clerk organization reads and
   writes that organization's billing, model endpoints, policy packs and
   escrow holds. Without an organization, the user owns a private tenant.
2. **Machines** — `X-API-Key: <key>`, used by the Python and JS SDKs and the
   MCP server. Matched by SHA-256, so the stored value is not the secret.
   A machine key is its own tenant and is never written to the users table.

---

## Rotating the machine keys

```bash
# 1. generate a key and its hash
KEY=$(python -c "import secrets;print('sk_'+secrets.token_urlsafe(32))")
HASH=$(python -c "import hashlib,sys;print(hashlib.sha256(sys.argv[1].encode()).hexdigest())" "$KEY")
echo "key: $KEY"; echo "hash: $HASH"

# 2. set INTELLIRITY_API_KEY_HASHES in the deployment, then redeploy
# 3. give $KEY to the client
```

Revoke by removing the hash and redeploying.
