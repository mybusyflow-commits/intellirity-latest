"""Test hygiene: rate-limit buckets are per-process memory shared by the
whole suite. Clear them before each test so feature tests never trip
each other's budgets. The limiters themselves are proven live against
the running server (documented 429s), not here."""
import pytest


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
