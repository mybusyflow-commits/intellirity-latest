"""Razorpay checkout integration.

Dependency-free (httpx + stdlib only) implementation of Razorpay's standard
checkout: create an order server-side, hand the client the order id, and
confirm capture from either of two signed paths:

1. The Checkout success callback, whose signature is an HMAC-SHA256 over
   ``{order_id}|{payment_id}`` keyed by the merchant secret. Fast, but it is
   client-reported, so it is treated as advisory.
2. The server webhook, whose ``X-Razorpay-Signature`` is an HMAC-SHA256 over
   the raw request body keyed by the webhook secret. Authoritative.

Both paths must verify a signature before an order is marked paid; neither
trusts a plain order id. When the webhook secret is not configured the
webhook endpoint refuses every request (fail closed).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
from typing import Optional

import httpx

logger = logging.getLogger("intellirity.razorpay")

API = "https://api.razorpay.com/v1"


def _cfg():
    from app.core.config import settings

    return settings


def enabled() -> bool:
    s = _cfg()
    return bool(s.RAZORPAY_KEY_ID and s.RAZORPAY_KEY_SECRET)


def webhook_enabled() -> bool:
    return enabled() and bool(_cfg().RAZORPAY_WEBHOOK_SECRET)


def _sign(payload: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()


def _auth_header() -> str:
    s = _cfg()
    token = base64.b64encode(
        f"{s.RAZORPAY_KEY_ID}:{s.RAZORPAY_KEY_SECRET}".encode("utf-8")
    ).decode("ascii")
    return f"Basic {token}"


async def create_order(
    amount_paise: int,
    receipt: str,
    currency: str = "INR",
    notes: Optional[dict] = None,
) -> dict:
    """Create a Razorpay order. Returns its JSON dict, or raises RuntimeError.

    ``receipt`` is capped at 40 characters (Razorpay's limit) and carries our
    internal ``ORD-…`` id so the webhook can map a Razorpay order back to a
    local order.
    """
    payload: dict = {
        "amount": int(amount_paise),
        "currency": currency,
        "receipt": (receipt or "")[:40],
    }
    if notes:
        payload["notes"] = notes
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"{API}/orders",
            headers={"Authorization": _auth_header(), "Content-Type": "application/json"},
            json=payload,
        )
    if resp.status_code >= 400:
        try:
            detail = (resp.json().get("error") or {}).get("description") or resp.text
        except Exception:
            detail = resp.text
        raise RuntimeError(f"Razorpay order creation failed: {detail}")
    return resp.json()


def verify_payment_signature(
    razorpay_order_id: str, razorpay_payment_id: str, signature: str
) -> bool:
    """Check the Checkout success-callback signature (advisory path)."""
    if not enabled():
        return False
    expected = _sign(f"{razorpay_order_id}|{razorpay_payment_id}", _cfg().RAZORPAY_KEY_SECRET)
    return hmac.compare_digest(expected, signature or "")


def verify_webhook_signature(raw_body: bytes, signature: str) -> bool:
    """Check the server webhook signature (authoritative path)."""
    if not webhook_enabled():
        return False
    expected = hmac.new(
        _cfg().RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature or "")
