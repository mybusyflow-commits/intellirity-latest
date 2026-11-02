"""PayU India hosted checkout: hashes, fields and verification.

PayU is a redirect flow, not a JavaScript SDK:

  1. the server builds a form (key, txnid, amount, ...) and signs it;
  2. the browser POSTs that form to test.payu.in or secure.payu.in;
  3. PayU POSTs the result back to `surl`/`furl` on our server;
  4. we verify the reverse hash before granting anything.

The salt never leaves the server. Every function here is pure apart from
reading settings, so the hash rules are unit-testable.

Reference: https://docs.payu.in/docs/hash-generation
"""
from __future__ import annotations

import hashlib
import hmac
import json
import urllib.parse
import urllib.request
from decimal import Decimal, ROUND_HALF_UP

from app.core.config import settings

TEST_ENDPOINT = "https://test.payu.in/_payment"
LIVE_ENDPOINT = "https://secure.payu.in/_payment"


def enabled() -> bool:
    return bool(settings.PAYU_KEY_ID and settings.PAYU_KEY_SECRET)


def mode() -> str:
    value = (settings.PAYU_MODE or "test").strip().lower()
    return "live" if value in ("live", "production", "prod") else "test"


def endpoint() -> str:
    return LIVE_ENDPOINT if mode() == "live" else TEST_ENDPOINT


def _sha512(value: str) -> str:
    return hashlib.sha512(value.encode("utf-8")).hexdigest()


def _amount(value: float | int) -> str:
    """PayU expects a decimal string with exactly two places."""
    return str(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def request_hash(
    txnid: str,
    amount: str,
    productinfo: str,
    firstname: str,
    email: str,
    udf1: str = "",
    udf2: str = "",
    udf3: str = "",
    udf4: str = "",
    udf5: str = "",
) -> str:
    """sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||salt)."""
    parts = [
        settings.PAYU_KEY_ID,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
        "",
        "",
        "",
        "",
        "",
        settings.PAYU_KEY_SECRET,
    ]
    return _sha512("|".join(parts))


def response_hash(data: dict) -> str:
    """The reverse hash PayU sends back.

    sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|
           productinfo|amount|txnid|key)
    """
    parts = [
        settings.PAYU_KEY_SECRET,
        str(data.get("status", "")),
        "",
        "",
        "",
        "",
        "",
        str(data.get("udf5", "")),
        str(data.get("udf4", "")),
        str(data.get("udf3", "")),
        str(data.get("udf2", "")),
        str(data.get("udf1", "")),
        str(data.get("email", "")),
        str(data.get("firstname", "")),
        str(data.get("productinfo", "")),
        str(data.get("amount", "")),
        str(data.get("txnid", "")),
        settings.PAYU_KEY_ID,
    ]
    return _sha512("|".join(parts))


def verify_response(data: dict) -> bool:
    """True only when the reverse hash matches and the status is known."""
    received = str(data.get("hash", "") or "").strip().lower()
    if not received:
        return False
    if not enabled():
        return False
    expected = response_hash(data).lower()
    if not hmac.compare_digest(expected, received):
        return False
    return str(data.get("status", "")).lower() in ("success", "failure", "failed", "pending")


def is_success(data: dict) -> bool:
    return verify_response(data) and str(data.get("status", "")).lower() == "success"


def callback_urls(base_url: str | None = None) -> tuple[str, str]:
    """Where PayU sends the browser after success / failure.

    A missing local default must never send a real payment to localhost: the
    checkout endpoint passes the request's own origin when the configured
    value is empty or a dev URL.
    """
    base = (base_url or settings.PUBLIC_SITE_URL or "http://localhost:3000").rstrip("/")
    url = f"{base}/backend/billing/payu/callback"
    return url, url


def fields(
    *,
    txnid: str,
    total_inr: float | int,
    order_id: str,
    firstname: str,
    email: str,
    phone: str,
    productinfo: str = "Intellirity modules",
    base_url: str | None = None,
) -> dict[str, str]:
    """The complete signed form the browser must POST to `endpoint()`."""
    surl, furl = callback_urls(base_url)
    amount = _amount(total_inr)
    return {
        "key": settings.PAYU_KEY_ID,
        "txnid": txnid,
        "amount": amount,
        "productinfo": productinfo,
        "firstname": firstname,
        "email": email,
        "phone": phone,
        "surl": surl,
        "furl": furl,
        "udf1": order_id,
        "service_provider": "payu_paisa",
        "hash": request_hash(txnid, amount, productinfo, firstname, email, udf1=order_id),
    }

def verify_payment(txnid: str) -> dict[str, str]:
    """Ask PayU for the authoritative state of one transaction.

    The browser callback is best-effort: a closed tab, a proxy timeout or a
    redirect can lose it even though the money moved. This server-to-server
    lookup is what lets the buyer recover access without contacting support.
    """
    if not enabled() or not txnid:
        return {"ok": "false", "status": "unavailable", "message": "PayU is not configured."}
    command = "verify_payment"
    signature = hashlib.sha512(
        f"{settings.PAYU_KEY_ID}|{command}|{txnid}|{settings.PAYU_KEY_SECRET}".encode("utf-8")
    ).hexdigest()
    body = urllib.parse.urlencode(
        {
            "key": settings.PAYU_KEY_ID,
            "command": command,
            "var1": txnid,
            "hash": signature,
        }
    ).encode("utf-8")
    endpoint = (
        "https://test.payu.in/merchant/postservice.php?form=2"
        if mode() == "test"
        else "https://info.payu.in/merchant/postservice.php?form=2"
    )
    request = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Intellirity-Billing/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8", "replace"))
    except Exception as exc:
        return {"ok": "false", "status": "unreachable", "message": str(exc)[:160]}

    details = (payload.get("transaction_details") or {}).get(txnid) or {}
    status = str(details.get("status", "not-found")).lower()
    success = status == "success"
    return {
        "ok": "true" if success else "false",
        "status": status,
        "amount": str(details.get("amt", "") or details.get("transaction_amount", "")),
        "txnid": str(details.get("txnid", txnid)),
        "mihpayid": str(details.get("mihpayid", "")),
        "error_code": str(details.get("error_code", "")),
        "message": str(details.get("error_Message", "") or payload.get("msg", ""))[:160],
    }
