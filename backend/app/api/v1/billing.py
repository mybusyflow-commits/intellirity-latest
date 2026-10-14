from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.security import require_user
from app.services import billing as store

router = APIRouter()


def _owner(user: dict) -> str:
    return str(user.get("sub") or user.get("user_id") or "local-dev")


@router.get("/products")
async def products():
    return {"products": store.PRODUCTS, "currency": "INR", "enforced": store.is_enforced()}


class CheckoutBody(BaseModel):
    modules: list[str] = []


@router.post("/checkout")
async def checkout(body: CheckoutBody, user: dict = Depends(require_user)):
    order = store.checkout(_owner(user), body.modules)
    if "error" in order:
        raise HTTPException(status_code=422, detail=order["error"])
    return order


class ActivateBody(BaseModel):
    order_id: str


@router.post("/activate")
async def activate(body: ActivateBody, user: dict = Depends(require_user)):
    res = store.activate(body.order_id, _owner(user))
    if "error" in res:
        raise HTTPException(status_code=404 if res["error"] == "Unknown order." else 409,
                            detail=res["error"])
    return res


@router.get("/entitlements")
async def entitlements(user: dict = Depends(require_user)):
    owner = _owner(user)
    return {"owner": owner, "enforced": store.is_enforced(),
            "owned": sorted(store.owned_products(owner))}


@router.get("/orders")
async def orders(user: dict = Depends(require_user)):
    owner = _owner(user)
    mine = [o for o in store._orders.values() if o.get("owner") == owner]
    return {"orders": mine}
