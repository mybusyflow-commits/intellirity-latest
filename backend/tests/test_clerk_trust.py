"""Clerk session-token trust rules.

The engine must accept tokens from exactly one Clerk instance. Before this
was pinned, the verifier read `iss` out of the token itself and fetched that
issuer's JWKS -- so a token signed by any attacker-controlled domain would
validate. These tests pin the fix.
"""
import base64
import json
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException  # noqa: E402

from app.core import config, security  # noqa: E402

ISSUER = "https://example.clerk.accounts.dev"


def _b64(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")


def _token(payload: dict, header: dict | None = None) -> str:
    head = header or {"alg": "RS256", "kid": "key_test", "typ": "JWT"}
    return f"{_b64(head)}.{_b64(payload)}.c2ln"


def _fake_settings(**overrides):
    base = {
        "ENVIRONMENT": "production",
        "SECRET_KEY": "a-real-secret",
        "VPI_SIGNING_KEY": "a-real-vpi-key",
        "DATABASE_URL": "postgresql+asyncpg://u:p@db.internal:5432/app",
        "CLERK_SECRET_KEY": "sk_test_x",
        "CLERK_PUBLISHABLE_KEY": "",
        "CLERK_ISSUER": ISSUER,
        "CLERK_AUTHORIZED_PARTIES": "",
        "INTELLIRITY_API_KEY_HASHES": "",
        "INTELLIRITY_API_KEYS": "",
    }
    base.update(overrides)
    return config.Settings(**base)


def test_a_token_from_another_issuer_is_rejected_before_any_key_fetch(monkeypatch):
    monkeypatch.setattr(security, "settings", _fake_settings())

    def _explode(_url):  # must never be reached
        raise AssertionError("JWKS fetched for an untrusted issuer")

    monkeypatch.setattr(security, "_get_jwks", _explode)

    with pytest.raises(HTTPException) as exc:
        security.verify_clerk_token(
            _token({"iss": "https://evil.example", "exp": int(time.time()) + 60, "sub": "u_1"}),
            "sk_test_x",
        )
    assert exc.value.status_code == 401
    assert "issuer" in exc.value.detail.lower()


def test_the_issuer_is_read_from_the_configured_value(monkeypatch):
    monkeypatch.setattr(security, "settings", _fake_settings())
    assert security.clerk_issuer() == ISSUER


def test_the_issuer_can_be_derived_from_the_publishable_key(monkeypatch):
    host = "example.clerk.accounts.dev"
    pk = "pk_test_" + base64.urlsafe_b64encode(f"{host}$".encode()).decode().rstrip("=")
    monkeypatch.setattr(
        security, "settings",
        _fake_settings(CLERK_ISSUER="", CLERK_PUBLISHABLE_KEY=pk),
    )
    assert security.clerk_issuer() == f"https://{host}"


def test_production_without_a_resolvable_issuer_is_a_boot_problem(monkeypatch):
    monkeypatch.setattr(
        config, "settings",
        _fake_settings(CLERK_ISSUER="", CLERK_PUBLISHABLE_KEY=""),
    )
    problems = config.validate_production_secrets()
    assert any("CLERK_ISSUER" in p for p in problems)


def test_a_token_minted_for_another_origin_is_rejected(monkeypatch):
    monkeypatch.setattr(
        security, "settings",
        _fake_settings(CLERK_AUTHORIZED_PARTIES="https://intellirity.ai"),
    )

    def _explode(_url):
        raise AssertionError("JWKS fetched before the azp check")

    monkeypatch.setattr(security, "_get_jwks", _explode)

    with pytest.raises(HTTPException) as exc:
        security.verify_clerk_token(
            _token({
                "iss": ISSUER,
                "azp": "https://someone-else.example",
                "exp": int(time.time()) + 60,
                "sub": "u_1",
            }),
            "sk_test_x",
        )
    assert exc.value.status_code == 401
    assert "origin" in exc.value.detail.lower()


def test_production_refuses_rs256_when_no_issuer_is_configured(monkeypatch):
    monkeypatch.setattr(
        security, "settings",
        _fake_settings(CLERK_ISSUER="", CLERK_PUBLISHABLE_KEY=""),
    )
    with pytest.raises(HTTPException) as exc:
        security.verify_clerk_token(
            _token({"iss": ISSUER, "exp": int(time.time()) + 60, "sub": "u_1"}),
            "sk_test_x",
        )
    assert exc.value.status_code == 503
