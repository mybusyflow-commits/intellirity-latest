import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.core.security import require_user
from app.core.identity import owner as _owner, role as _role, org_id as _org_id
from app.core.config import settings
from app.services import billing as store
from app.services import razorpay

router = APIRouter()


@router.get("/products")
async def products():
    bundle = store.quote([p["id"] for p in store.PRODUCTS])
    return {
        "products": store.PRODUCTS,
        "currency": "INR",
        "enforced": store.is_enforced(),
        "payment": "razorpay" if store.razorpay_enabled() else "dev",
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


@router.post("/checkout")
async def checkout(body: CheckoutBody, user: dict = Depends(require_user)):
    order = store.checkout(_owner(user), body.modules)
    if "error" in order:
        raise HTTPException(status_code=422, detail=order["error"])
    if store.razorpay_enabled():
        try:
            rzp = await razorpay.create_order(
                order["total_inr"] * 100, order["order_id"],
                notes={"owner": _owner(user)},
            )
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"Payment provider unavailable: {exc}")
        store.attach_payment(order["order_id"], razorpay_order_id=rzp["id"])
        order["razorpay_order_id"] = rzp["id"]
        order["amount"] = rzp["amount"]
        order["currency"] = rzp["currency"]
        order["key_id"] = settings.RAZORPAY_KEY_ID
    return order


class VerifyBody(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/verify")
async def verify(body: VerifyBody, user: dict = Depends(require_user)):
    if not razorpay.verify_payment_signature(
        body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature
    ):
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")
    res = store.mark_paid(body.order_id, via="razorpay")
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@router.post("/webhook")
async def webhook(request: Request):
    """Server-to-server confirmation from Razorpay. Signed, no auth cookie."""
    raw = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    if not razorpay.verify_webhook_signature(raw, sig):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")
    try:
        data = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook body.")
    if data.get("event") == "payment.captured":
        payload = data.get("payload") or {}
        order_entity = (payload.get("order") or {}).get("entity") or {}
        payment_entity = (payload.get("payment") or {}).get("entity") or {}
        receipt = order_entity.get("receipt") or (payment_entity.get("notes") or {}).get("receipt")
        if receipt:
            store.mark_paid(receipt, via="razorpay-webhook")
    return {"ok": True}


class ActivateBody(BaseModel):
    order_id: str


@router.post("/activate")
async def activate(body: ActivateBody, user: dict = Depends(require_user)):
    if store.razorpay_enabled():
        raise HTTPException(status_code=404, detail="Unknown order.")
    res = store.activate(body.order_id, _owner(user))
    if "error" in res:
        raise HTTPException(status_code=404 if res["error"] == "Unknown order." else 409,
                            detail=res["error"])
    return res


@router.get("/entitlements")
async def entitlements(user: dict = Depends(require_user)):
    owner = _owner(user)
    return {"owner": owner, "org_id": _org_id(user), "role": _role(user),
            "enforced": store.is_enforced(),
            "owned": sorted(store.owned_products(owner))}


@router.get("/orders")
async def orders(user: dict = Depends(require_user)):
    owner = _owner(user)
    mine = [o for o in store._orders.values() if o.get("owner") == owner]
    return {"orders": mine}
