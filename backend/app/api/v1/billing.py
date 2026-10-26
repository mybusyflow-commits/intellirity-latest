"""Billing: catalogue, checkout, and the PayU redirect flow.

Checkout creates an order, persists it, and — when PayU is configured —
returns the signed form the browser must POST to PayU. PayU then POSTs the
result back to /billing/payu/callback, where the reverse hash is verified
before any module is granted.

The order is written to Postgres *before* the browser leaves, because the
callback can land on a different serverless instance than the checkout.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from app.core.security import require_user
from app.core.identity import owner as _owner, role as _role, org_id as _org_id
from app.core.config import settings
from app.db import persist
from app.services import billing as store
from app.services import payu

router = APIRouter()


def _site(path: str = "") -> str:
    base = (settings.PUBLIC_SITE_URL or "http://localhost:3000").rstrip("/")
    return f"{base}{path}"


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
async def checkout(body: CheckoutBody, user: dict = Depends(require_user)):
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


async def _activate(data: dict, via: str) -> tuple[bool, str]:
    """Verify the reverse hash, then activate. Returns (ok, order_id)."""
    if not payu.verify_response(data):
        return False, ""
    txnid = str(data.get("txnid", "") or data.get("udf1", ""))
    order = await _order_for(txnid, str(data.get("udf1", "")))
    if order is None:
        return False, txnid
    status = str(data.get("status", "")).lower()
    if status != "success":
        return False, order["order_id"]

    store.remember_order(order)
    result = store.mark_paid(order["order_id"], via=via)
    if "error" in result:
        return False, order["order_id"]
    order = result["order"]
    order["provider_txnid"] = txnid
    order["paid_at"] = datetime.now(timezone.utc).isoformat()
    await persist.update_order(order)
    # Only a real transition may extend the paid-through date. PayU retries
    # webhooks; granting on every replay would hand out a free month each
    # time. grant_entitlements also skips a row already stamped with this
    # order id, as a second line of defence.
    if result.get("newly_paid"):
        await persist.grant_entitlements(
            order["owner"], order.get("modules", []), order["order_id"]
        )
    return True, order["order_id"]


@router.post("/payu/callback")
async def payu_callback(request: Request):
    """PayU's browser return (surl/furl). Public: authenticated by the hash."""
    form = await request.form()
    data = {str(k): str(v) for k, v in form.items()}
    ok, order_id = await _activate(data, via="payu")
    if ok:
        return RedirectResponse(_site(f"/pricing?payment=success&order={order_id}"), status_code=303)
    reason = "failed" if data.get("status", "").lower() != "success" else "invalid"
    suffix = f"&order={order_id}" if order_id else ""
    return RedirectResponse(_site(f"/pricing?payment={reason}{suffix}"), status_code=303)


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
async def entitlements(user: dict = Depends(require_user)):
    owner = _owner(user)
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
