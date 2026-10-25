"""Deployment safety rules.

A production deployment must fail loudly rather than run insecurely. These
tests pin that behaviour.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core import config  # noqa: E402
from app.services import turnstile  # noqa: E402


def _settings(**overrides):
    base = {
        "ENVIRONMENT": "production",
        "SECRET_KEY": "a-real-secret",
        "VPI_SIGNING_KEY": "a-real-vpi-key",
        "DATABASE_URL": "postgresql+asyncpg://x@y/db",
        "CLERK_SECRET_KEY": "sk_test_x",
        "CLERK_ISSUER": "https://example.clerk.accounts.dev",
        "INTELLIRITY_API_KEY_HASHES": "",
        "INTELLIRITY_API_KEYS": "",
    }
    base.update(overrides)
    return config.Settings(**base)


def test_a_fully_configured_production_deployment_has_no_problems(monkeypatch):
    monkeypatch.setattr(config, "settings", _settings())
    assert config.validate_production_secrets() == []


def test_missing_auth_is_a_production_problem(monkeypatch):
    s = _settings(CLERK_SECRET_KEY="", INTELLIRITY_API_KEY_HASHES="")
    monkeypatch.setattr(config, "settings", s)
    problems = config.validate_production_secrets()
    assert any("authentication" in p for p in problems)


def test_the_default_secret_key_is_a_production_problem(monkeypatch):
    monkeypatch.setattr(config, "settings", _settings(SECRET_KEY="dev-secret-key"))
    problems = config.validate_production_secrets()
    assert any("SECRET_KEY" in p for p in problems)


def test_a_missing_vpi_key_is_a_production_problem(monkeypatch):
    monkeypatch.setattr(config, "settings", _settings(VPI_SIGNING_KEY=""))
    problems = config.validate_production_secrets()
    assert any("VPI_SIGNING_KEY" in p for p in problems)


def test_development_is_never_flagged(monkeypatch):
    monkeypatch.setattr(config, "settings", _settings(ENVIRONMENT="development",
                                                      SECRET_KEY="dev-secret-key",
                                                      VPI_SIGNING_KEY="",
                                                      CLERK_SECRET_KEY="",
                                                      DATABASE_URL=""))
    assert config.validate_production_secrets() == []


def test_turnstile_fails_closed_in_production(monkeypatch):
    monkeypatch.setattr(turnstile, "_secret", lambda: "")
    monkeypatch.setattr(turnstile, "_is_production", lambda: True)
    ok, reason = turnstile.verify_turnstile("token", "1.2.3.4")
    assert ok is False
    assert "not configured" in reason


def test_turnstile_stays_open_in_development(monkeypatch):
    monkeypatch.setattr(turnstile, "_secret", lambda: "")
    monkeypatch.setattr(turnstile, "_is_production", lambda: False)
    ok, reason = turnstile.verify_turnstile("token", "1.2.3.4")
    assert ok is True
    assert reason == "unconfigured"


def test_turnstile_rejects_a_missing_token(monkeypatch):
    monkeypatch.setattr(turnstile, "_secret", lambda: "secret")
    ok, reason = turnstile.verify_turnstile("", "1.2.3.4")
    assert ok is False
    assert "missing token" in reason
