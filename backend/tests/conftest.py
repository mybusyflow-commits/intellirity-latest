"""Test hygiene.

1. Rate-limit buckets are per-process memory shared by the whole suite.
   Clear them before each test so feature tests never trip each other's
   budgets. The limiters themselves are proven live against the running
   server (documented 429s), not here.

2. The database is disabled for the whole suite. A test run must never be
   able to write to whatever DATABASE_URL happens to be in backend/.env.
   `app.db.persist.init_db` honours INTELLIRITY_DISABLE_DB and stays in
   memory mode, which is also what CI runs without a Postgres service.

3. Authentication is disabled for the whole suite. backend/.env holds the
   real Clerk keys once a developer configures them; without this, the
   feature tests would suddenly need a signed session token and would fail
   for the wrong reason.
"""
import os

import pytest

os.environ["INTELLIRITY_DISABLE_DB"] = "1"
os.environ["CLERK_SECRET_KEY"] = ""
os.environ["CLERK_PUBLISHABLE_KEY"] = ""
os.environ["CLERK_ISSUER"] = ""
os.environ["CLERK_AUTHORIZED_PARTIES"] = ""
os.environ["INTELLIRITY_API_KEYS"] = ""
os.environ["INTELLIRITY_API_KEY_HASHES"] = ""
os.environ["ENVIRONMENT"] = "development"

# 4. Third-party side effects are disabled for the suite. Once real keys
#    live in backend/.env, the contact tests would call Cloudflare and send
#    real email -- and fail on the missing Turnstile token. Tests must never
#    reach a third party or spend money.
for _name in (
    "TURNSTILE_SECRET",
    "RESEND_API_KEY",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "PAYU_KEY",
    "PAYU_KEY_ID",
    "PAYU_SALT",
    "PAYU_KEY_SECRET",
    "PAYU_WEBHOOK_SECRET",
):
    os.environ[_name] = ""


@pytest.fixture(autouse=True)
def _clear_rate_limits():
    try:
        from app import main as app_main
        for q in getattr(app_main, "_ip_hits", {}).values():
            q.clear()
    except Exception:
        pass
    try:
        from app.core import ratelimit
        for q in getattr(ratelimit, "_buckets", {}).values():
            q.clear()
    except Exception:
        pass
    yield
