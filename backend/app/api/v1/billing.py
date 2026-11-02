"""Billing: catalogue, checkout, and the PayU redirect flow.

Checkout creates an order, persists it, and — when PayU is configured —
returns the signed form the browser must POST to PayU. PayU then POSTs the
result back to /billing/payu/callback, where the reverse hash is verified
before any module is granted.

The order is written to Postgres *before* the browser leaves, because the
callback can land on a different serverless instance than the checkout.
"""
import asyncio
from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from app.core.security import require_user
from app.core.identity import owner as _owner, role as _role, org_id as _org_id
from app.core.config import settings
from app.db import persist
from app.services import billing as store
from app.services import payu

router = APIRouter()
log = logging.getLogger("intellirity.billing")


def _public_base(request: Request | None = None) -> str:
    """The origin a buyer should return to.

    The domain the browser actually used wins: the site is served on both
    the apex and www (with a redirect between them), so a hard-coded value
    would send the gateway to the other host and add a redirect to a POST.
    Only this site's own domains are trusted from the request headers; the
    configured value is the fallback and the only option in local dev.
    """
    configured = (settings.PUBLIC_SITE_URL or "").strip().rstrip("/")

    if request is not None:
        host = (request.headers.get("x-forwarded-host") or request.headers.get("host") or "")
        host = host.split(",")[0].strip().split(":")[0].lower()
        if host == "intellirity.com" or host.endswith(".intellirity.com"):
            proto = (
                request.headers.get("x-forwarded-proto")
                or request.url.scheme
                or "https"
            ).split(",")[0].strip()
            return f"{proto}://{host}"

    dev = "localhost" in configured or "127.0.0.1" in configured
    if configured and not dev:
        return configured
    return configured or "http://localhost:3000"


def _site(path: str = "", request: Request | None = None) -> str:
    return f"{_public_base(request)}{path}"


@router.get("/products")
async def products():
    bundle = store.quote([p["id"] for p in store.PRODUCTS])
    return {
        "products": store.PRODUCTS,
        "currency": "INR",
        "enforced": store.is_enforced(),
        "payment": store.payment_provider(),
        "payu_mode": payu.mode() if payu.enabled() else None,
        # The UI renders the discount from this object rather than hardcoding
        # a percentage, so the displayed and charged totals stay identical.
        "bundle": {
            "discount_pct": store.BUNDLE_DISCOUNT_PCT,
            "module_count": len(store.PRODUCTS),
            "subtotal_inr": bundle.get("subtotal_inr", 0),
            "total_inr": bundle.get("total_inr", 0),
        },
    }


class CheckoutBody(BaseModel):
    modules: list[str] = []
    # Collected only when a gateway is live; PayU requires a phone number.
    phone: str = ""
    firstname: str = ""
    email: str = ""


def _valid_email(value: str) -> bool:
    return "@" in value and "." in value.rsplit("@", 1)[-1]


def _valid_phone(value: str) -> bool:
    digits = "".join(ch for ch in value if ch.isdigit())
    return 10 <= len(digits) <= 15


@router.post("/checkout")
async def checkout(body: CheckoutBody, request: Request, user: dict = Depends(require_user)):
    owner = _owner(user)
    order = store.checkout(owner, body.modules)
    if "error" in order:
        raise HTTPException(status_code=422, detail=order["error"])

    if not payu.enabled():
        # Dev mode: a labelled pending order, activated only via /activate.
        await persist.save_order(order)
        return order

    email = (body.email or str(user.get("email") or "")).strip()
    firstname = (body.firstname or str(user.get("name") or "Customer")).strip()[:60]
    phone = body.phone.strip()
    if not _valid_phone(phone):
        raise HTTPException(status_code=422, detail="A valid phone number is required for PayU.")
    if not _valid_email(email):
        raise HTTPException(status_code=422, detail="A valid email address is required for PayU.")

    fields = payu.fields(
        txnid=order["order_id"],
        total_inr=order["total_inr"],
        order_id=order["order_id"],
        firstname=firstname,
        email=email,
        phone=phone,
        productinfo=f"Intellirity bundle ({len(order['modules'])} modules)",
        base_url=_public_base(request),
    )
    order["provider"] = "payu"
    order["payu_mode"] = payu.mode()
    order["provider_txnid"] = order["order_id"]
    await persist.save_order(order)

    return {
        **order,
        "provider": "payu",
        "payu_mode": payu.mode(),
        "action": payu.endpoint(),
        "fields": fields,
    }


async def _order_for(txnid: str, udf1: str = "") -> dict | None:
    """Find the order in memory, then in Postgres (different instance)."""
    for key in (txnid, udf1):
        if not key:
            continue
        found = store._orders.get(key)
        if found:
            return found
    for key in (txnid, udf1):
        if not key:
            continue
        loaded = await persist.load_order(key)
        if loaded:
            return store.remember_order(loaded)
    return None


async def _grant_paid(order: dict, txnid: str, via: str) -> tuple[bool, dict]:
    """Mark an order paid and grant its modules exactly once."""
    store.remember_order(order)
    result = store.mark_paid(order["order_id"], via=via)
    if "error" in result:
        log.warning("payu %s: order %s could not be marked paid: %s", via, order["order_id"], result["error"])
        return False, order
    paid = result["order"]
    paid["provider_txnid"] = txnid or order.get("provider_txnid", "")
    paid["paid_at"] = datetime.now(timezone.utc).isoformat()
    await persist.update_order(paid)
    # Only a real transition may extend the paid-through date. PayU retries
    # callbacks; grant_entitlements also skips an order already stamped.
    if result.get("newly_paid"):
        granted = await persist.grant_entitlements(
            paid["owner"], paid.get("modules", []), paid["order_id"]
        )
        log.info(
            "payu %s activated order %s with %s module(s) (granted=%s)",
            via, paid["order_id"], len(paid.get("modules", [])), granted,
        )
    return True, paid


async def _activate(data: dict, via: str) -> tuple[bool, str]:
    """Verify the reverse hash, then activate. Returns (ok, order_id)."""
    if not payu.verify_response(data):
        # Never log the form: it carries name, email and phone.
        log.warning("payu %s rejected: invalid hash (status=%s)", via, data.get("status"))
        return False, ""
    txnid = str(data.get("txnid", "") or data.get("udf1", ""))
    order = await _order_for(txnid, str(data.get("udf1", "")))
    if order is None:
        log.warning("payu %s: unknown order %s", via, txnid[:40])
        return False, txnid
    status = str(data.get("status", "")).lower()
    if status != "success":
        log.info("payu %s: order %s came back as %s", via, order["order_id"], status)
        return False, order["order_id"]

    ok, paid = await _grant_paid(order, txnid, via)
    return ok, paid["order_id"]


class PayuSyncBody(BaseModel):
    order_id: str


@router.post("/payu/sync")
async def payu_sync(body: PayuSyncBody, user: dict = Depends(require_user)):
    """Recover a captured payment whose browser callback was lost.

    The buyer's own session must match the order. PayU is the authority for
    the transaction state, and the amount must equal what the order charges
    before a single module is granted.
    """
    owner = _owner(user)
    order = await _order_for(body.order_id)
    if not order or order.get("owner") != owner:
        raise HTTPException(status_code=404, detail="Unknown order.")
    if order.get("status") == "active":
        return {"synced": True, "already_active": True, "order": order}
    if not order.get("provider_txnid") and order.get("provider") != "payu":
        raise HTTPException(status_code=409, detail="This order is not a PayU payment.")

    result = await asyncio.to_thread(payu.verify_payment, body.order_id)
    if result.get("ok") != "true":
        return {
            "synced": False,
            "status": result.get("status", "pending"),
            "message": result.get("message", "PayU has not confirmed this payment yet."),
        }
    try:
        paid_amount = round(float(result.get("amount") or 0), 2)
    except (TypeError, ValueError):
        paid_amount = -1
    if abs(paid_amount - float(order.get("total_inr", 0))) > 0.01:
        log.warning(
            "payu sync: amount mismatch for %s (expected %s, got %s)",
            order["order_id"], order.get("total_inr"), result.get("amount"),
        )
        raise HTTPException(status_code=409, detail="The paid amount does not match this order.")

    ok, paid = await _grant_paid(order, str(result.get("txnid") or body.order_id), "payu-sync")
    return {
        "synced": ok,
        "already_active": False,
        "order": paid,
        "modules": paid.get("modules", []),
    }


@router.post("/payu/callback")
async def payu_callback(request: Request):
    """PayU's browser return (surl/furl). Public: authenticated by the hash."""
    form = await request.form()
    data = {str(k): str(v) for k, v in form.items()}
    ok, order_id = await _activate(data, via="payu")
    if ok:
        return RedirectResponse(
            _site(f"/pricing?payment=success&order={order_id}", request),
            status_code=303,
        )
    reason = "failed" if data.get("status", "").lower() != "success" else "invalid"
    suffix = f"&order={order_id}" if order_id else ""
    return RedirectResponse(
        _site(f"/pricing?payment={reason}{suffix}", request), status_code=303
    )


@router.get("/payu/callback")
async def payu_callback_probe(request: Request):
    """A GET on the callback either carries a (rare) signed GET result or is
    a person/bot opening the URL from the dashboard.

    A gateway reviewing this endpoint should see a normal 200 page with a
    link back to pricing, not a 405/redirect error. A signed GET result is
    processed exactly like the POST path so no payment is lost.
    """
    data = {str(k): str(v) for k, v in request.query_params.items()}
    if data.get("status") and data.get("hash"):
        ok, order_id = await _activate(data, via="payu-get")
        if ok:
            return RedirectResponse(
                _site(f"/pricing?payment=success&order={order_id}", request),
                status_code=303,
            )
        reason = "failed" if str(data.get("status", "")).lower() != "success" else "invalid"
        suffix = f"&order={order_id}" if order_id else ""
        return RedirectResponse(
            _site(f"/pricing?payment={reason}{suffix}", request), status_code=303
        )

    target = _site("/pricing", request)
    return HTMLResponse(
        f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Payment callback | Intellirity</title>
<style>
 body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#07080a;color:#e7e9ee;
      font:14px/1.6 ui-sans-serif,system-ui,sans-serif}}
 main{{max-width:440px;padding:32px;text-align:center}}
 a{{color:#e7e9ee}}
</style></head>
<body><main>
<p style="letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#8b909c">
  Intellirity billing</p>
<h1 style="font-size:22px;font-weight:500;margin:12px 0">Payment callback</h1>
<p style="color:#a6abb6">This endpoint receives payment confirmations from the
payment gateway. Open the pricing page to see your plan.</p>
<p><a href="{target}">Go to pricing</a></p>
</main></body></html>""",
        status_code=200,
        headers={"Cache-Control": "no-store"},
    )


@router.get("/payu/urls")
async def payu_urls(request: Request):
    """The exact URLs to paste into the PayU dashboard.

    No secret is returned; this is the same information the checkout form
    sends to the gateway and what a merchant copies during onboarding.
    """
    base = _public_base(request)
    return {
        "provider": store.payment_provider(),
        "mode": payu.mode() if payu.enabled() else None,
        "site_url": base,
        "callback_url": f"{base}/backend/billing/payu/callback",
        "webhook_url": f"{base}/backend/billing/payu/webhook",
        "sitemap": f"{base}/sitemap.xml",
    }


@router.post("/payu/webhook")
async def payu_webhook(request: Request):
    """Optional server-to-server webhook. Same hash, no browser."""
    if request.headers.get("content-type", "").startswith("application/json"):
        try:
            data = {str(k): str(v) for k, v in (await request.json()).items()}
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid webhook body.")
    else:
        form = await request.form()
        data = {str(k): str(v) for k, v in form.items()}
    ok, _order_id = await _activate(data, via="payu-webhook")
    if not ok:
        raise HTTPException(status_code=401, detail="Invalid or unsuccessful PayU payload.")
    return {"ok": True}


class ActivateBody(BaseModel):
    order_id: str


@router.post("/activate")
async def activate(body: ActivateBody, user: dict = Depends(require_user)):
    # A live gateway must confirm payment; the simulated path is dev-only.
    if payu.enabled():
        raise HTTPException(status_code=404, detail="Unknown order.")
    res = store.activate(body.order_id, _owner(user))
    if "error" in res:
        raise HTTPException(status_code=404 if res["error"] == "Unknown order." else 409,
                            detail=res["error"])
    order = res.get("order")
    if isinstance(order, dict):
        await persist.update_order(order)
        await persist.grant_entitlements(order["owner"], order.get("modules", []), order["order_id"])
    return res


@router.get("/orders/{order_id}")
async def order_status(order_id: str, user: dict = Depends(require_user)):
    owner = _owner(user)
    order = store._orders.get(order_id) or await persist.load_order(order_id)
    if not order or order.get("owner") != owner:
        raise HTTPException(status_code=404, detail="Unknown order.")
    return {
        "order_id": order["order_id"],
        "status": order["status"],
        "total_inr": order["total_inr"],
        "modules": order.get("modules", []),
        "paid_via": order.get("paid_via", ""),
    }


@router.get("/entitlements")
async def entitlements(user: dict = Depends(require_user), fresh: bool = False):
    owner = _owner(user)
    # A browser returning from a payment must be able to bypass the 120s
    # per-instance cache: the purchase was just written by the callback and
    # may have landed on a different instance.
    if fresh:
        await persist.hydrate_entitlements(owner)
    details = store.entitlement_details(owner)
    return {
        "owner": owner,
        "org_id": _org_id(user),
        "role": _role(user),
        "enforced": store.is_enforced(),
        "owned": sorted(store.owned_products(owner)),
        # expires_at / days_left per module, so the console can show a
        # renewal date instead of implying permanent access.
        "entitlements": details,
        "period_days": store.PERIOD_DAYS,
    }


@router.get("/orders")
async def orders(user: dict = Depends(require_user)):
    owner = _owner(user)
    mine = [o for o in store._orders.values() if o.get("owner") == owner]
    return {"orders": mine}
