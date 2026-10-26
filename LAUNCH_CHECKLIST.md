# Launch Checklist

Everything between the current commit and a live production deployment.

Legend: `[x]` done and verified · `[ ]` open · `[you]` needs an account,
credential, domain, payment, or a human on a real device — something code
cannot create.

---

## 0. What changed in the release-hardening pass

Beyond the earlier audit, this pass fixed defects that only appear in
production:

- **Vercel routing was broken.** A Python file in `api/` is served at its
  own file path (`api/index.py` → `/api`), so the old rewrite to
  `/api/v1/:path*` had nothing to land on. The rewrite now carries the path
  as `?__path=…` and `PathRewriteMiddleware` restores it before routing.
  Covered by four tests.
- **The fail-closed config check was one-shot.** It ran on the first request
  and was then skipped, so request #2 served a misconfigured production
  deployment. The result is now cached and re-enforced on every request.
- **Contact submissions were lost on restart.** The form wrote to an
  in-memory list. It now persists to `contact_submissions` *before*
  attempting mail, then notifies through Resend or SMTP. A mail outage
  delays a notification; it no longer loses a lead.
- **The test suite wrote to the live database.** `INTELLIRITY_DISABLE_DB`
  now forces memory mode in tests (and in CI), so a test run cannot touch
  real data.
- **The ledger repair tool produced unverifiable seals.** It hashed records
  while their stale `merkle_hash` was still in the payload. Fixed, and
  `scripts/verify_ledger.py` now recomputes every seal independently.
  Result: **119 records, chain intact.**
- **`/docs`, `/redoc` and `/openapi.json` were public in production.**
  Disabled there; still available in development.
- **`.env` was only half-honoured.** `pydantic-settings` read it into
  `Settings`, but modules using `os.getenv` (Turnstile, rate limits, JSON
  logs, mail) ignored it. `.env` is now loaded into `os.environ` with real
  environment variables taking precedence.
- **Docker could not build the frontend** (no Dockerfile) and the backend
  image likely failed at `poetry install` (no `package-mode = false`). Both
  fixed; the console image is a production standalone build.
- **Localhost database in production is now fatal.** A deploy that would
  quietly run memory-only and lose the ledger fails at boot instead.
- API responses now send `X-Robots-Tag: noindex`; HSTS is production-only;
  the API CSP no longer allows script CDNs; the rate-limit map is bounded.
- `/.well-known/security.txt` added (RFC 9116).
- Bing Webmaster verification meta added.
- Sitemap no longer claims every page changed at request time.

---

## 1. Code — done and verified

- [x] Fail-closed production posture (auth, `SECRET_KEY`, `VPI_SIGNING_KEY`, non-local `DATABASE_URL`)
- [x] Clerk human auth + org-scoped multi-tenancy (org switcher, org claims → tenant)
- [x] Machine API keys matched by SHA-256 (SDKs, MCP); invalid key → 401
- [x] Database-authoritative, fork-proof ledger (advisory lock + monotonic `seq`)
- [x] Independent ledger verifier (`scripts/verify_ledger.py`); 119/119 intact
- [x] HMAC-SHA256 proof-of-intent certificates
- [x] Autonomous escrow state machine
- [x] PayU checkout: signed form → reverse-hash callback → modules granted (orders persisted)
- [x] Reverse proxy fails closed when a screening engine errors
- [x] CSP, HSTS (prod only), COOP/CORP, `X-Frame-Options: DENY`, `private, no-store` + `X-Robots-Tag: noindex` on the API
- [x] API docs disabled in production
- [x] Consent-gated analytics; bundled three.js (no unpkg, no eval)
- [x] Per-page canonicals, console `noindex` (3 mechanisms), single JSON-LD `@graph`
- [x] `/robots.txt`, `/sitemap.xml`, `/.well-known/security.txt`, `/llms.txt`, `/llms-full.txt`, manifest, icons, OG card
- [x] Legal pages (`/privacy`, `/terms`, `/security`), `/engines`, `/pricing`
- [x] Contact form persists to Postgres before mail; Resend/SMTP notification
- [x] Health probes (`/health`, `/backend/system/health`) report DB, ledger head, mail transport
- [x] Backup, restore-drill, ledger-verify and maintenance scripts
- [x] Production Dockerfiles (non-root, healthchecks) + Compose with required secrets
- [x] CI: engine tests, typecheck, build, production dependency audit
- [x] Next.js 16.4.2 (two critical RCE advisories fixed); production audit clean
- [x] Tests: backend 64 · API 66 · brain 132 · fixes 15 · workspace 13 · machine 7 ·
      concurrency 3 · Python SDK 24 · JS SDK 25 · SEO 94 · links 55

## 2. Accounts and credentials — you

- [you] Buy the domain and point DNS at Vercel
- [you] Clerk: create app, enable Organizations, copy `sk_live_…` + `pk_live_…`, allow the production origin
- [you] Postgres (Neon/Supabase): create DB, copy the pooled `DATABASE_URL`, enable point-in-time recovery
- [you] PayU: merchant Key + Salt, `PAYU_MODE=live`
- [you] Groq (or any OpenAI-compatible gateway): key
- [you] Cloudflare Turnstile: site key + secret
- [you] Mail transport: Resend key **or** SMTP credentials, plus `CONTACT_INBOX`
- [you] **Rotate every secret that was ever in `backend/.env` in plaintext**
- [you] Google Analytics 4 property, Search Console, Bing Webmaster (post-launch)

## 3. Environment — paste into Vercel → Settings → Environment Variables

Required (`ENVIRONMENT=production`):

```
DATABASE_URL=postgresql+asyncpg://...
SECRET_KEY=<generated>
VPI_SIGNING_KEY=<generated>
CLERK_SECRET_KEY=sk_live_...
CLERK_ISSUER=https://your-app.clerk.accounts.dev
CLERK_AUTHORIZED_PARTIES=https://intellirity.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SITE_URL=https://intellirity.com
NEXT_PUBLIC_GATEWAY_URL=https://intellirity.com
NEXT_PUBLIC_DEPLOY_ENV=production
ALLOWED_ORIGINS=https://intellirity.com
ENVIRONMENT=production
```

Strongly recommended:

```
OPENCODEZEN_API_KEY=<gateway key>
OPENCODEZEN_BASE_URL=https://api.groq.com/openai/v1
TURNSTILE_SECRET=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
CONTACT_INBOX=security@intellirity.com
EMAIL_FROM="Intellirity <noreply@intellirity.com>"
RESEND_API_KEY=re_...            # or SMTP_* below
# SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASSWORD=...
PAYU_KEY_ID=<merchant key>
PAYU_KEY_SECRET=<salt, 32 chars>
PAYU_MODE=live
PUBLIC_SITE_URL=https://intellirity.com
INTELLIRITY_API_KEY_HASHES=<sha256 of each machine key>
BILLING_ENFORCED=true
LOG_JSON=true
TIMEZONE=Asia/Kolkata
```

Post-launch:

```
NEXT_PUBLIC_GA_ID=G-...
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=...
NEXT_PUBLIC_BING_SITE_VERIFICATION=...
```

Generate the two signing keys with:

```bash
python -c "import secrets;print(secrets.token_urlsafe(48))"
```

---

## 4. The standard website pre-launch list, applied to this product

The WordPress-flavoured checklist, item by item. "N/A" means the item exists
for blog/CMS sites and has no equivalent here.

| # | Check | Status |
|---|---|---|
| 1 | Site title & tagline | [x] `Intellirity · Security Operations for AI` in one source of truth (`lib/site.ts`) |
| 2 | Favicon | [x] `favicon.png` 64px, `favicon-full.png` 512px, `apple-icon.png` 180px, manifest icons |
| 3 | Page titles & meta descriptions | [x] Every public page sets its own; titles use the `%s · Intellirity` template |
| 4 | Image ALT tags | [x] No raw `<img>` without alt; decorative vector art is `aria-hidden` |
| 5 | Social share image | [x] `og-image.png` 1200×630 with alt text; `summary_large_image` card |
| 6 | Google Map & NAP | N/A — no physical premises or local search intent |
| 7 | All H1 tags | [x] Landing (hero), `/engines`, `/pricing`, legal pages, console (topbar), 404, 500, sign-in/up |
| 8 | 404 page | [x] Custom, with routes back, explicitly `noindex` |
| 9 | Test all links | [x] 55/55 internal links resolve, zero 404s |
| 10 | Sitemap | [x] Generated from the route registry; console/sign-in excluded |
| 11 | Category & author noindex | N/A — no taxonomy pages |
| 12 | Form submissions | [x] Contact form verified end-to-end in development: `200`, ticket `INT-20261025-…`, row in `contact_submissions`. **Needs Turnstile keys in production.** |
| 13 | Reply-to, subject, form ID | [x] `Reply-To` = submitter, subject `[Intellirity] INT-… · subject · name`, unique ticket |
| 14 | Google Mobile-Friendly | [ ] Run against the live domain — needs the domain |
| 15 | Real-device mobile test | [ ] **You** — one phone pass on the landing page, pricing and console |
| 16 | Privacy policy | [x] `/privacy`, crawlable, lists subprocessors and retention |
| 17 | Correct time zone | [x] Storage is UTC; display via `TIMEZONE`/`TZ` (default `Asia/Kolkata`) |
| 18 | GTmetrix / Pingdom | [ ] Run against the live domain — needs the domain |
| 19 | Caching stack | [x] Immutable static assets; API `private, no-store`; CDN via Vercel |
| 20 | Clean up database | [x] `scripts/db_maintenance.py` (vacuum + size report), run and verified |
| 21 | Make a backup | [x] `scripts/backup_db.py`; verified against the live dev DB. **Enable provider PITR + a nightly cron (you).** |
| 22 | Enable indexing | [x] `robots.txt` allows public pages, blocks console; sitemap lists only public routes |
| 23 | Automatic backups | [ ] **You** — schedule the script / enable PITR |
| 24 | Install security | [x] In-app: CSP, HSTS, COOP/CORP, rate limits, Turnstile, fail-closed auth. [ ] Optional: Cloudflare in front |
| 25 | Uptime monitoring | [ ] **You** — create the monitor (endpoints are ready) |
| 26 | Connect Google Analytics | [ ] **You** — set `NEXT_PUBLIC_GA_ID`; loads only after consent |
| 27 | Search Console | [ ] **You** — verify domain, submit sitemap |
| 28 | Bing Webmaster | [ ] **You** — verify domain, submit sitemap |
| 29 | Send backup to client | [ ] **You** — repo + this checklist + env variable *names* (never secrets) |

---

## 5. Remaining work, split by owner

### Mine (code) — nothing blocking

Everything actionable in code is done. The open items below all need an
account, a domain, a payment or a physical device.

### Yours (accounts and decisions)

1. Domains, DNS, Clerk app, Postgres, PayU, gateway key, Turnstile, mail.
2. Rotate the secrets currently in `backend/.env`.
3. Enable database PITR and schedule `scripts/backup_db.py`.
4. Create the uptime monitor on `/backend/system/health`, alert on non-200
   **and** on `ledger_records` not growing.
5. One real-device pass, then Lighthouse/GTmetrix on the live domain.
6. Post-launch: GA4, Search Console, Bing, and one real ₹79 purchase.

### Known limitations (unchanged, stated honestly)

- Threat feed, workspace caches and policy state are memory-first; a restart
  resets them. The ledger, orders, entitlements and contact submissions are
- PayU confirms a one-off payment; each plan covers 30 days and renewals
  are manual. No card is stored and there is no automatic charge. UPI
  Autopay needs standing-instruction enablement from PayU.
- No per-page OG images (one strong site-wide card instead).
- Admin views for `contact_submissions` are SQL, not a console page.
