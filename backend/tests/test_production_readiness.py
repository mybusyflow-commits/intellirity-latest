"""Production-readiness rules.

Each test here pins a behaviour that only fails in production if it is
missing: the Vercel path mapping, cache/indexability of API responses,
durable contact capture, and the fail-closed configuration checks.

They run against the in-memory app, so they need no database or network.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient  # noqa: E402

from app.core import config  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app, raise_server_exceptions=False)


# --- Vercel rewrite: /backend/<path> arrives as /api?__path=<path> ---------

def test_the_vercel_rewrite_parameter_maps_back_to_the_api_path():
    r = client.get("/api", params={"__path": "system/status"})
    assert r.status_code == 200
    assert r.json()["backend"] == "connected"


def test_the_rewrite_parameter_is_removed_before_the_application_sees_it():
    # If __path survived, FastAPI would treat it as an unknown query param
    # and the endpoint would ignore it -- the record below proves the path
    # itself was rewritten, not merely tolerated.
    r = client.get("/api", params={"__path": "system/summary"})
    assert r.status_code == 200
    assert "security_score" in r.json()


def test_the_rewrite_keeps_the_callers_own_query_parameters():
    r = client.get("/api", params={"__path": "threats", "severity": "high"})
    assert r.status_code == 200
    assert all(t["severity"] == "high" for t in r.json())


def test_the_health_sentinel_reaches_the_root_health_route():
    r = client.get("/api", params={"__health": "1"})
    assert r.status_code == 200
    assert r.json()["service"] == "intellirity"


# --- Liveness -------------------------------------------------------------

def test_health_reports_the_components_an_operator_needs():
    body = client.get("/health").json()
    for key in ("status", "database", "ledger_records", "contact_notifications"):
        assert key in body, key
    assert body["status"] == "healthy"  # development runs memory-first


def test_the_api_router_exposes_the_same_health_probe():
    # Uptime monitors cannot reach /health behind the console rewrite, so
    # the API router carries an equivalent probe.
    r = client.get("/api/v1/system/health")
    assert r.status_code == 200
    assert r.json()["service"] == "intellirity"


# --- Response policy ------------------------------------------------------

def test_api_responses_are_never_cached_and_never_indexed():
    r = client.get("/api/v1/system/status")
    assert "no-store" in r.headers["cache-control"]
    assert "private" in r.headers["cache-control"]
    assert "noindex" in r.headers["x-robots-tag"]
    assert "authorization" in r.headers["vary"].lower()


def test_hsts_is_not_sent_by_a_development_server():
    r = client.get("/api/v1/system/status")
    assert "strict-transport-security" not in r.headers


# --- Contact form: never lose a lead -------------------------------------

def _payload(**overrides):
    body = {
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "subject": "Pilot",
        "message": "We would like to screen a support assistant.",
        "turnstile_token": "",
    }
    body.update(overrides)
    return body


def test_a_valid_submission_gets_a_traceable_ticket():
    r = client.post("/api/v1/system/contact", json=_payload())
    assert r.status_code == 200, r.text
    ticket = r.json()["ticket"]
    assert ticket.startswith("INT-")
    assert len(ticket) >= 16


def test_a_bad_email_is_rejected_before_it_is_stored():
    r = client.post("/api/v1/system/contact", json=_payload(email="not-an-address"))
    assert r.status_code == 422


def test_the_response_never_reveals_whether_storage_or_mail_succeeded():
    # An attacker probing the deployment must not learn which dependency
    # is down. The body is identical either way.
    r = client.post("/api/v1/system/contact", json=_payload())
    assert set(r.json()) == {"ok", "ticket", "message"}


def test_a_submission_survives_a_database_outage_in_the_process_buffer(monkeypatch):
    from app.db import persist

    async def _down(_submission):
        return False

    monkeypatch.setattr(persist, "save_contact_submission", _down)
    r = client.post("/api/v1/system/contact", json=_payload(email="buffer@example.com"))
    assert r.status_code == 200

    from app.api.v1 import system

    assert any(row["email"] == "buffer@example.com" for row in system._contact_store)


# --- Fail-closed configuration -------------------------------------------

def _settings(**overrides):
    base = {
        "ENVIRONMENT": "production",
        "SECRET_KEY": "a-real-secret",
        "VPI_SIGNING_KEY": "a-real-vpi-key",
        "DATABASE_URL": "postgresql+asyncpg://user:pw@db.internal:5432/app",
        "CLERK_SECRET_KEY": "sk_test_x",
        "CLERK_ISSUER": "https://example.clerk.accounts.dev",
        "INTELLIRITY_API_KEY_HASHES": "",
        "INTELLIRITY_API_KEYS": "",
        "RESEND_API_KEY": "re_test",
        "TURNSTILE_SECRET": "ts",
        "ALLOWED_ORIGINS": "https://intellirity.ai",
    }
    base.update(overrides)
    return config.Settings(**base)


def test_a_localhost_database_is_a_production_problem(monkeypatch):
    monkeypatch.setattr(
        config, "settings",
        _settings(DATABASE_URL="postgresql+asyncpg://u:p@localhost:5432/app"),
    )
    problems = config.validate_production_secrets()
    assert any("localhost" in p for p in problems)


def test_missing_mail_transport_is_a_warning_not_a_boot_failure(monkeypatch):
    monkeypatch.setattr(config, "settings", _settings(RESEND_API_KEY="", SMTP_HOST=""))
    assert config.validate_production_secrets() == []
    assert any("mail transport" in w for w in config.production_warnings())


def test_a_fully_configured_deployment_has_no_warnings(monkeypatch):
    monkeypatch.setattr(config, "settings", _settings())
    assert config.production_warnings() == []


def test_turnstile_without_a_secret_is_a_production_warning(monkeypatch):
    monkeypatch.setattr(config, "settings", _settings(TURNSTILE_SECRET=""))
    assert any("TURNSTILE_SECRET" in w for w in config.production_warnings())
