"""Test hygiene.

1. Rate-limit buckets are per-process memory shared by the whole suite.
   Clear them before each test so feature tests never trip each other's
   budgets. The limiters themselves are proven live against the running
   server (documented 429s), not here.

2. The database is disabled for the whole suite. A test run must never be
   able to write to whatever DATABASE_URL happens to be in backend/.env.
   `app.db.persist.init_db` honours INTELLIRITY_DISABLE_DB and stays in
   memory mode, which is also what CI runs without a Postgres service.
"""
import os

import pytest

os.environ["INTELLIRITY_DISABLE_DB"] = "1"


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
