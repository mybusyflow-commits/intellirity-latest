# Deployment

Three supported shapes. Pick one; all three run the same engine.

---

## 1. Vercel (the console + the API in one project)

The Next.js console and the FastAPI engine deploy as one Vercel project:
the console is a Next.js app and the engine is a Python serverless
function at `api/index.py`.

### How the API is routed (read this before changing `vercel.json`)

A Python file in `api/` is served at **its own file path only**: Vercel maps
`api/index.py` to `/api`, and there is no `/api/v1/*` route on Vercel to
rewrite to. So the rewrite carries the path in a query instead:

```
/backend/system/status   ->   /api?__path=system/status
```

`PathRewriteMiddleware` in `backend/app/main.py` turns `__path` back into
the real request path (`/api/v1/system/status`) before routing, then removes
the parameter. `/health` uses the same mechanism with a sentinel.

If you switch this project to a **Python framework preset** (so Vercel
routes every request to the ASGI app), delete the rewrite; the middleware is
a no-op without `__path` and the app serves `/api/v1/*` directly.

Locally and in Docker the console proxies `/backend/*` straight to
`<BACKEND_INTERNAL_URL>/<path>`; only Vercel uses the query form.

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
CLERK_ISSUER=https://your-app.clerk.accounts.dev   # required: pins who may issue tokens
CLERK_AUTHORIZED_PARTIES=https://your-domain.com   # optional azp pin
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_GATEWAY_URL=https://your-domain.com
NEXT_PUBLIC_DEPLOY_ENV=production
ALLOWED_ORIGINS=https://your-domain.com
ENVIRONMENT=production
```

**Optional:**

```
OPENCODEZEN_API_KEY=...                    # LLM upstream key (e.g. a Groq key)
OPENCODEZEN_BASE_URL=https://api.groq.com/openai/v1   # any OpenAI-compatible gateway
OPENCODEZEN_MODEL=...                      # pin a model; auto-discovered otherwise
TURNSTILE_SECRET=...                       # required for the public contact form
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...         # its public counterpart (build time)
CONTACT_INBOX=security@intellirity.com      # where leads are announced
EMAIL_FROM="Intellirity <noreply@intellirity.com>"
RESEND_API_KEY=re_...                      # mail transport A
# SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=...   # mail transport B
TIMEZONE=Asia/Kolkata                      # presentation only; storage is UTC
BILLING_ENFORCED=true                      # enforce plan entitlements
INTELLIRITY_API_KEY_HASHES=<sha256,...>    # machine keys for the SDKs and MCP
PAYU_KEY_ID=...                            # merchant Key (PayU dashboard)
PAYU_KEY_SECRET=...                        # Salt, 32 characters
PAYU_MODE=live                             # test | live
PUBLIC_SITE_URL=https://intellirity.com    # PayU return URLs
LOG_JSON=true
```

### What the production posture does

`ENVIRONMENT=production` turns on the fail-closed rules:

- The engine **refuses to start** if there is no auth configured, if
  `SECRET_KEY` is still the default, if `VPI_SIGNING_KEY` is unset, or if
  `DATABASE_URL` points at `localhost` (a deploy that would quietly lose the
  ledger on every restart).
- Interactive API docs (`/docs`, `/redoc`, `/openapi.json`) are **disabled**
  so the endpoint map is not published to the internet.
- The console returns **503** rather than rendering an unauthenticated
  shell, if `CLERK_SECRET_KEY` is missing.
- The public contact form **refuses** submissions if `TURNSTILE_SECRET` is
  missing, instead of accepting spam.
- The reverse proxy **denies** a request when a screening engine errors.
- HTTP is redirected to HTTPS by default, and HSTS is sent only over HTTPS.

### After the first deploy

1. **Point the domain.** Set `NEXT_PUBLIC_SITE_URL` to the final origin and
   redeploy — every canonical tag, the sitemap, robots.txt and the
   structured data derive from it.
2. **Verify the database.** The engine creates missing tables on boot. For a
   ledger written by an older build, check it first and repair only if the
   report says `broken_link`:
   ```bash
   python scripts/verify_ledger.py
   ```
3. **Verify Clerk.** Add your production domain to Clerk's allowed origins,
   and set the publishable key in Vercel.
4. **Check the crawl surface.** `/robots.txt`, `/sitemap.xml`,
   `/.well-known/security.txt`, `/llms.txt` and `/llms-full.txt`.
5. **Submit the sitemap** in Google Search Console and Bing Webmaster Tools,
   and paste the verification tokens into
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and
   `NEXT_PUBLIC_BING_SITE_VERIFICATION`.
6. **Turn on uptime monitoring** (below).

### Lead capture

The contact form writes to `contact_submissions` **before** it tries to
send anything. A mail outage therefore delays a notification; it does not
lose the lead. A submission is accepted only after the Turnstile check, and
the response deliberately does not say whether storage or mail succeeded,
so an attacker cannot probe which dependency is down.

Configure exactly one transport:

| Transport | Variables |
|---|---|
| Resend | `RESEND_API_KEY` |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_STARTTLS` |

Plus `CONTACT_INBOX` (recipient) and `EMAIL_FROM` (envelope sender). The
notification carries a `[Intellirity] INT-YYYYMMDD-XXXXXX · subject · name`
subject and sets `Reply-To` to the submitter, so replying answers the lead.

Read leads without mail:

```sql
select ticket, created_at, name, email, subject, notified
from contact_submissions order by created_at desc limit 50;
```

`notified = false` means the row is durable but the mail transport did not
accept it — safe to resend manually, never lost.

### Backups

The ledger is the evidence trail; a backup you cannot restore is not a
backup. Two layers:

1. **Provider PITR.** Enable point-in-time recovery on the managed Postgres
   (Neon: enable history retention). This covers the last few days.
2. **Portable dumps.** Nightly, off-provider if possible:

```bash
python scripts/backup_db.py --out /var/backups/intellirity --keep 30
```

Custom-format dumps (restore with `pg_restore`), pruned to the last 30, and
the script deletes a truncated dump rather than leaving something that
looks like a backup. Schedule it with cron:

```cron
15 2 * * * cd /srv/intellirity && python scripts/backup_db.py --quiet >> /var/log/intellirity-backup.log 2>&1
```

Restore drill (do this once before launch, not during an incident):

```bash
createdb intellirity_restore
pg_restore --no-owner --no-privileges -d intellirity_restore intellirity-<stamp>.dump
python scripts/verify_ledger.py          # with DATABASE_URL pointed at the restore
```

### Maintenance

```bash
python scripts/db_maintenance.py          # vacuum + size/row report
python scripts/db_maintenance.py --report # size/row report only
python scripts/verify_ledger.py           # independent chain re-computation
```

`db_maintenance.py` is the real equivalent of "clean up the database": there
are no post revisions to prune, so the useful work is compaction, planner
statistics, and knowing how fast `ledger_records` is growing.

### Uptime monitoring

Point any monitor (UptimeRobot, Better Stack, Pingdom) at:

```
https://your-domain.com/health              # direct engine (Docker/sidecar)
https://your-domain.com/backend/system/health   # through the console (Vercel)
```

Both return `200` when healthy and `503` when a production deployment has
lost its database. The body names the failing component:

```json
{"status":"healthy","database":"connected","database_latency_ms":11.4,
 "ledger_records":119,"ledger_head":"d3c5…","contact_notifications":"configured"}
```

Alert on non-200, and separately on `ledger_records` failing to grow while
traffic is flowing (a silent write failure is worse than an outage).

### Analytics and consent

`NEXT_PUBLIC_GA_ID` enables Google Analytics 4. The tag loads **only after
the visitor accepts** in the consent banner; the choice is stored in
`localStorage` as `intellirity-analytics-consent`. No analytics request is
made before consent, so the privacy policy matches the behaviour.

### Time zone

Every stored timestamp is UTC (`datetime.now(timezone.utc)`, `DateTime(timezone=True)`).
`TIMEZONE` (engine) and `TZ` (containers) affect presentation and mail only.
Do not change them to "fix" a timestamp — change the formatter.

---

## 2. Docker Compose (whole stack, one host)

```bash
cp .env.example .env          # fill in POSTGRES_PASSWORD and the secrets
docker compose up -d --build
```

- Postgres 16, the FastAPI engine on `127.0.0.1:8000`, the Next console on
  `127.0.0.1:3000`. Put a TLS-terminating reverse proxy in front.
- The console image is a production standalone build (not `next dev`), runs
  as a non-root user, and has a healthcheck.
- `POSTGRES_PASSWORD` is required: the stack refuses to start without it.
- `ENVIRONMENT` defaults to `development`; set it to `production` and
  provide every secret before exposing this to the internet.
- `docker compose ps` shows `healthy` for both services when the engine can
  reach the database.

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
| `OPENCODEZEN_API_KEY` | optional | LLM upstream key (Groq, Zen, any OpenAI-compatible gateway) |
| `OPENCODEZEN_BASE_URL` | optional | Gateway base URL. Groq: `https://api.groq.com/openai/v1` |
| `OPENCODEZEN_MODEL` | optional | Pin a model; auto-discovered from the gateway otherwise |
| `PAYU_KEY_ID` | for payments | Merchant Key from the PayU dashboard |
| `PAYU_KEY_SECRET` | for payments | Salt (32 chars); signs request and response hashes |
| `PAYU_MODE` | **yes** | `test` → `test.payu.in`, `live` → `secure.payu.in` |
| `PUBLIC_SITE_URL` | **yes** | Public origin used to build PayU's return URLs |
| `TURNSTILE_SECRET` | recommended | Spam protection for the contact form |
| `CONTACT_INBOX` | recommended | Recipient of contact-form notifications |
| `EMAIL_FROM` | recommended | Envelope sender for notifications |
| `RESEND_API_KEY` | one transport | Mail transport A |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | one transport | Mail transport B |
| `TIMEZONE` | optional | Presentation timezone (default `Asia/Kolkata`) |
| `BILLING_ENFORCED` | optional | `true` enforces plan entitlements |
| `LOG_JSON` | optional | Structured JSON logs |
| `RATE_LIMIT_PER_MINUTE` | optional | Per-IP API budget (default 60) |

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
| `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Bing Webmaster `msvalidate.01` token |

---

## Clerk setup (the only supported identity provider)

The console and the engine share one Clerk application. There are five
values to collect and two dashboard settings that must match the deploy.

**1. Create the application.** Clerk dashboard → *Create application* →
name it, choose the sign-in methods you want (email + password is enough to
start; Google is one toggle).

**2. Copy the keys.** Dashboard → *API keys*:

| Dashboard value | Environment variable | Where |
|---|---|---|
| Publishable key `pk_live_…` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel (build + runtime) |
| Secret key `sk_live_…` | `CLERK_SECRET_KEY` | Vercel (server) + engine |
| Frontend API URL | `CLERK_ISSUER` | engine |

`CLERK_ISSUER` is the origin shown on that page, for example
`https://your-app.clerk.accounts.dev`. It is what the engine pins: a token
from any other issuer is rejected before its keys are fetched. The engine
can derive it from the publishable key, but set it explicitly — production
refuses to boot without a resolvable issuer.

**3. Enable Organizations.** Dashboard → *Organizations* → enable. Turn
**off** "Personal accounts" if every user must belong to a team; leave it
on if solo users are allowed. The engine maps the org claim to a tenant:

| Clerk claim | Engine tenant |
|---|---|
| `org_id` present | `org:<org_id>` |
| no organization | `user:<sub>` |

Roles come from `org_role` (`org:admin` is the admin role). Policy-pack
promotion requires an admin and two different approvers.

**4. Allow the production origin.** Dashboard → *Domains* (or *Paths*) →
add the production hostname, e.g. `intellirity.com`. Also set
`CLERK_AUTHORIZED_PARTIES=https://intellirity.com` in the engine so a token
minted for another origin is refused even if it is validly signed.

**5. Point the app at the pages.** Already wired: `/sign-in` and `/sign-up`
render Clerk's components, `afterSignOutUrl` is `/`, and the org switcher
lives in the console topbar.

**6. Verify, in this order:**

```bash
# a. with no keys, a production console must refuse to render
curl -i https://your-domain.com/console | head -1        # 503

# b. with keys, it redirects to Clerk
curl -i https://your-domain.com/console | grep -i location

# c. the engine rejects an unsigned token
curl -i https://your-domain.com/backend/system/summary \
  -H "Authorization: Bearer not-a-token" | head -1       # 401/503, never 200
```

Then sign in in a browser, create an organization, switch to it, and
confirm the console reloads data for that org.

**Local development.** Put `pk_test_…` / `sk_test_…` in
`Intellirity-Frontend/.env.local` and the same `sk_test_…` plus
`CLERK_ISSUER` in `backend/.env`. Without keys the console runs in open
mode locally, which is intentional — do not copy that state to production.

---

## Identity model

Two independent paths, both enforced by `require_user`:

1. **Humans** — `Authorization: Bearer <Clerk session JWT>`. The token's
   signature is verified by RS256 against the JWKS of **one pinned issuer**
   (`CLERK_ISSUER`, derived from the publishable key if unset); a token from
   any other issuer is rejected before its keys are fetched. HS256 with
   `SECRET_KEY` remains available for local tokens. The `org_id` claim
   decides the tenant: a member of a Clerk organization reads and writes
   that organization's billing, model endpoints, policy packs and escrow
   holds. Without an organization, the user owns a private tenant.
2. **Machines** — `X-API-Key: <key>`, used by the Python and JS SDKs and the
   MCP server. Matched by SHA-256, so the stored value is not the secret.
   A machine key is its own tenant and is never written to the users table.

---

## Payments (PayU)

Checkout is live when `PAYU_KEY_ID` (merchant Key) and `PAYU_KEY_SECRET`
(Salt, 32 characters) are set. `PAYU_MODE` selects the environment:
`test` → `test.payu.in`, `live` → `secure.payu.in`.

The flow is a signed redirect, not a JavaScript SDK:

1. `POST /billing/checkout` prices the bundle, **persists the order**, and
   returns `action` (the PayU endpoint) plus a signed `fields` object.
2. The browser POSTs that form to PayU. The salt never reaches the client.
3. PayU POSTs the result back to
   `POST /billing/payu/callback` (both success and failure). The engine
   verifies the **reverse SHA-512 hash**, activates the order, grants the
   modules in Postgres, and redirects the browser to
   `/pricing?payment=success|failed&order=…`.
4. `POST /billing/payu/webhook` accepts the same signed payload
   server-to-server if you enable webhooks in the PayU dashboard.

Set the return URL in the PayU dashboard (or rely on the `surl`/`furl`
sent with each request):

| Field | Value |
|---|---|
| Success URL | `https://intellirity.com/backend/billing/payu/callback` |
| Failure URL | `https://intellirity.com/backend/billing/payu/callback` |
| Webhook URL (optional) | `https://intellirity.com/backend/billing/payu/webhook` |

Orders and entitlements are written to Postgres **before** the buyer leaves
for PayU, because a serverless callback can land on a different instance.

With no PayU keys, checkout stays in dev mode: it records a
`pending-payment` order and `/billing/activate` simulates confirmation.
In a production build the console disables checkout when no provider is
configured, so a visitor can never create a fake paid order.

The browser CSP allows a form POST only to `secure.payu.in` and
`test.payu.in` (via `form-action`); no gateway script runs on our origin.

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

---

## Plans, expiry and renewal

Enforcement is **on by default in production** (`ENVIRONMENT=production`).
A module is usable only when the workspace owns an active entitlement; the
engine returns `403` with a human message otherwise, and the console locks
the route before it mounts. Set `BILLING_ENFORCED=false` only for a demo
deployment where unpaid modules must stay open.

Each payment covers **30 days** (`services.billing.PERIOD_DAYS`). A renewal
is another checkout: `grant_entitlements` extends from the later of now and
the current expiry, so renewing early never loses days. Entitlements are
persisted with `expires_at`; existing rows created before the column get a
one-off 30-day grace on boot rather than being locked out.

There is **no automatic charge**: PayU is used for one-off payments and no
card is stored. Renewals are manual from `/pricing`; the console shows a
paywall when a module is missing or expired. To add UPI Autopay/standing
instructions later, PayU must enable SI on the merchant account and the
checkout must send the SI fields — that is a provider-side onboarding step,
not a code toggle.

Public landing-page data comes from `/system/public-stats`,
`/system/public-feed` (demo/sample rows only) and `/system/demo-scan`
(free injection engine, rate-limited, records nothing). These are
unauthenticated by design and contain no tenant identifiers.

## Clerk: Google, GitHub and the OTP sender name

The sign-in page uses Clerk's `<SignIn />`; providers appear automatically
once enabled on the instance — no code change is needed.

**Google** (production instance needs your own OAuth credentials):
Clerk Dashboard → **SSO connections** → **Add connection** → *For all
users* → **Google** → enable for sign-up and sign-in, enable **Use custom
credentials**, copy the **Authorized Redirect URI**. Google Cloud Console →
APIs & Services → Credentials → Create OAuth client ID → Web application:
add `https://intellirity.com` and `https://www.intellirity.com` to
**Authorized JavaScript origins**, paste Clerk's redirect URI into
**Authorized Redirect URIs**, create, then paste the Client ID/Secret back
into Clerk and save. Set the Google OAuth consent screen to **In
production** before launch.

**GitHub**: Clerk → **SSO connections** → **Add connection** → *For all
users* → **GitHub** → custom credentials on → copy the **Authorization
Callback URL**. GitHub → Settings → Developer settings → OAuth Apps → New
OAuth App, paste the callback URL, register, generate a client secret, then
paste Client ID/Secret into Clerk.

**OTP sender shows "My Application"**: that is Clerk's default application
name. In Clerk Dashboard → **Settings → Branding** set the application name
to **Intellirity** (and upload the logo). Also open **Customization →
Emails**, and for each template set **From** to `noreply@intellirity.com`
and **Reply-To** to `security@intellirity.com` after verifying the domain in
Clerk (Domains → Email). The sender display name follows the application /
template name, so both must say Intellirity. Test with a real sign-up, not
the preview.

## Search Console, Bing and the canonical host

The canonical origin is derived from Vercel's **production domain** at build
time (`VERCEL_PROJECT_PRODUCTION_URL`). Whichever host Vercel serves is the
host in `<link rel="canonical">`, `robots.txt`, `llms.txt` and the sitemap,
so the two cannot disagree. At the time of writing Vercel serves
`www.intellirity.com` and redirects the apex to it, so every URL is
`https://www.intellirity.com/...`.

In Google Search Console:

1. Add a **Domain property** for `intellirity.com` (DNS TXT at Hostinger).
   It covers both apex and www, so a host change does not orphan the data.
   Alternatively add a URL-prefix property for `https://www.intellirity.com/`
   (the HTML verification file is already deployed).
2. Submit `https://www.intellirity.com/sitemap.xml`.
3. Do **not** submit the apex sitemap from an apex URL-prefix property: the
   apex 308-redirects to www, and every URL will report "Page with redirect".
4. In Bing Webmaster Tools, import the Search Console property (or add
   `https://www.intellirity.com/`) and submit the same sitemap.

The sitemap lists every indexable public page: `/`, `/engines`, `/pricing`,
`/glossary`, `/about`, `/privacy`, `/terms`, `/security`. `/console`,
`/sign-in`, `/sign-up` and `/dashboard` are deliberately excluded: they are
authenticated/utility pages and carry `noindex`.

If you later set `intellirity.com` as the primary domain in Vercel, redeploy:
the constants above follow it automatically and the sitemap flips to apex.
