"""Razorpay payment signature rules.

Both confirmation paths (the Checkout callback and the server webhook) must
verify an HMAC before an order is activated. These tests pin that, plus the
fail-closed behaviour when no webhook secret is configured.
"""
import hashlib
import hmac
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import razorpay  # noqa: E402
from app.services import billing  # noqa: E402


class _Cfg:
    RAZORPAY_KEY_ID = "rzp_test_key"
    RAZORPAY_KEY_SECRET = "merchant-secret"
    RAZORPAY_WEBHOOK_SECRET = "webhook-secret"


def _enable(monkeypatch):
    monkeypatch.setattr(razorpay, "_cfg", lambda: _Cfg())


def test_checkout_signature_is_accepted(monkeypatch):
    _enable(monkeypatch)
    sig = hmac.new(b"merchant-secret", b"order_1|pay_1", hashlib.sha256).hexdigest()
    assert razorpay.verify_payment_signature("order_1", "pay_1", sig) is True


def test_checkout_signature_is_rejected_when_wrong(monkeypatch):
    _enable(monkeypatch)
    assert razorpay.verify_payment_signature("order_1", "pay_1", "deadbeef") is False


def test_webhook_signature_is_accepted(monkeypatch):
    _enable(monkeypatch)
    body = b'{"event":"payment.captured"}'
    sig = hmac.new(b"webhook-secret", body, hashlib.sha256).hexdigest()
    assert razorpay.verify_webhook_signature(body, sig) is True


def test_webhook_fails_closed_without_a_secret(monkeypatch):
    class NoHook(_Cfg):
        RAZORPAY_WEBHOOK_SECRET = ""

    monkeypatch.setattr(razorpay, "_cfg", lambda: NoHook())
    body = b"{}"
    sig = hmac.new(b"", body, hashlib.sha256).hexdigest()
    assert razorpay.verify_webhook_signature(body, sig) is False


def test_payment_is_disabled_without_keys(monkeypatch):
    class NoKeys(_Cfg):
        RAZORPAY_KEY_ID = ""
        RAZORPAY_KEY_SECRET = ""

    monkeypatch.setattr(razorpay, "_cfg", lambda: NoKeys())
    assert razorpay.enabled() is False


def test_mark_paid_activates_once_and_is_idempotent():
    order = billing.checkout("tenant-payments-test", ["content-guard"])
    first = billing.mark_paid(order["order_id"], via="test")
    assert first["order"]["status"] == "active"
    assert "content-guard" in first["owned"]
    second = billing.mark_paid(order["order_id"], via="test")
    assert second["order"]["status"] == "active"


# --- Bundle discount -------------------------------------------------------

def test_a_partial_bundle_has_no_discount():
    priced = billing.quote(["content-guard", "wallet-guard"])
    assert priced["subtotal_inr"] == 158  # 79 + 79
    assert priced["discount_pct"] == 0
    assert priced["discount_inr"] == 0
    assert priced["total_inr"] == 158
    assert priced["bundle"] is False


def test_the_full_catalogue_gets_the_bundle_discount():
    ids = [p["id"] for p in billing.PRODUCTS]
    priced = billing.quote(ids)
    subtotal = sum(p["price"] for p in billing.PRODUCTS)
    assert priced["bundle"] is True
    assert priced["subtotal_inr"] == subtotal
    assert priced["discount_pct"] == billing.BUNDLE_DISCOUNT_PCT
    assert priced["discount_inr"] == round(subtotal * billing.BUNDLE_DISCOUNT_PCT / 100)
    assert priced["total_inr"] == priced["subtotal_inr"] - priced["discount_inr"]


def test_checkout_charges_the_discounted_total():
    ids = [p["id"] for p in billing.PRODUCTS]
    order = billing.checkout("tenant-bundle-test", ids)
    assert order["bundle"] is True
    assert order["discount_inr"] > 0
    assert order["total_inr"] == billing.quote(ids)["total_inr"]


def test_products_endpoint_publishes_the_bundle_rule():
    from fastapi.testclient import TestClient
    from app.main import app

    body = TestClient(app).get("/api/v1/billing/products").json()
    assert body["bundle"]["discount_pct"] == billing.BUNDLE_DISCOUNT_PCT
    assert body["bundle"]["module_count"] == len(billing.PRODUCTS)
    assert body["bundle"]["total_inr"] < body["bundle"]["subtotal_inr"]
