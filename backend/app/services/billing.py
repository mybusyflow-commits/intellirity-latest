"""Per-module products, entitlements, and checkout stubs.

Nine purchasable modules. Basics at Rs 79/99, the trust core
(escrow/ledger/VPI) at Rs 299/399. One customizable plan: buyers pick
modules and pay the sum. PayU confirms payment with a signed redirect;
when no gateway is configured, checkout records a pending order and the
dev-only /activate endpoint simulates confirmation.

Enforcement is OFF unless BILLING_ENFORCED=true, so local dev stays open.
When on, module scans 403 unless an engine belongs to a product the
workspace owns (threat intel feed stays free for everyone).
"""
import os
import time
import uuid

PRODUCTS = [
    {"id": "injection-shield", "name": "Injection Shield", "price": 99,
     "blurb": "Jailbreak + advanced encoding defense for every prompt.",
     "engines": ["jailbreak_injection_protection", "advanced_threat_intelligence"],
     "href": "/console/scanner", "tier": "basic"},
    {"id": "vibe-code", "name": "Vibe-Code Security", "price": 99,
     "blurb": "SQLi, XSS, secrets and supply-chain checks on AI-written code.",
     "engines": ["vibe_code_security", "model_supply_chain_security"],
     "href": "/console/scanner", "tier": "basic"},
    {"id": "leakage-guard", "name": "Leakage Guard", "price": 99,
     "blurb": "PII, secrets and pipeline-hop tracing on every output.",
     "engines": ["data_loss_prevention", "data_flow_tracker"],
     "href": "/console/leakage", "tier": "basic"},
    {"id": "content-guard", "name": "Content Guard", "price": 79,
     "blurb": "Spam, abuse, violence and self-harm screening, 7 categories.",
     "engines": ["content_moderation"],
     "href": "/console/content", "tier": "basic"},
    {"id": "agent-guard", "name": "Agent Guard", "price": 99,
     "blurb": "Action policy, session drift, MCP audit and workflow anomalies.",
     "engines": ["ai_action_policy_enforcer", "behavioral_analysis_engine",
                 "mcp_security_monitor", "workflow_anomaly_detector"],
     "href": "/console/behavior", "tier": "basic"},
    {"id": "wallet-guard", "name": "Wallet Guard", "price": 79,
     "blurb": "Runaway AI spend stopped before it bills.",
     "engines": ["denial_of_wallet_protector"],
     "href": "/console/wallet", "tier": "basic"},
    {"id": "escrow", "name": "Agent Escrow", "price": 399,
     "blurb": "Custody for autonomous value movement, oracle-verified.",
     "engines": ["autonomous_escrow"],
     "href": "/console/escrow", "tier": "core"},
    {"id": "ledger", "name": "Evidence Ledger", "price": 299,
     "blurb": "Tamper-evident Merkle-chained vault for every decision.",
     "engines": ["black_box_ledger"],
     "href": "/console/audit", "tier": "core"},
    {"id": "vpi", "name": "Proof of Intent", "price": 299,
     "blurb": "Signed human authorization for every agent action.",
     "engines": ["verifiable_proof_of_intent"],
     "href": "/console/proof", "tier": "core"},
]

# Engines that stay free for everyone even when enforcement is on. This is
# the advertised free tier: the basic injection screen and the threat feed.
FREE_ENGINES = {"threat_intelligence_feed", "jailbreak_injection_protection"}

# Buying the complete catalogue is discounted. This single number is
# returned by /billing/products and applied by checkout, so the price shown
# in the browser and the amount charged can never disagree.
BUNDLE_DISCOUNT_PCT = 20
ALL_MODULE_IDS = {p["id"] for p in PRODUCTS}

ENGINE_TO_PRODUCT = {}
for _p in PRODUCTS:
    for _e in _p["engines"]:
        ENGINE_TO_PRODUCT[_e] = _p["id"]

# A purchase covers one month. Renewal is a new checkout that extends the
# expiry from the later of "now" and the current expiry, so a buyer who pays
# early never loses days and a buyer who pays late starts from now.
PERIOD_DAYS = 30

# owner -> {product_id: expiry as unix seconds}. Memory-first like the rest
# of the dev stack; Postgres is the authority across instances/restarts.
_entitlements: dict[str, dict[str, float]] = {}
_orders: dict[str, dict] = {}


def is_enforced() -> bool:
    """Whether unpaid modules are refused.

    Explicit configuration wins. Otherwise a production deployment enforces
    by default: shipping a paywall that is off unless someone remembers a
    second environment variable is how unpaid modules stay free forever.
    Development and tests stay open unless BILLING_ENFORCED=true is set.
    """
    raw = os.getenv("BILLING_ENFORCED")
    if raw is not None and raw.strip() != "":
        return raw.strip().lower() in ("1", "true", "yes", "on")
    try:
        from app.core.config import settings

        return settings.ENVIRONMENT == "production"
    except Exception:
        return False


def _active(expires_at: float | None) -> bool:
    return expires_at is None or expires_at > time.time()


def owned_products(owner: str) -> set[str]:
    if not is_enforced():
        return {p["id"] for p in PRODUCTS}
    return {
        pid for pid, exp in _entitlements.get(owner, {}).items() if _active(exp)
    }


def entitlement_details(owner: str) -> dict[str, dict]:
    """Per-module entitlement state for the console and the renewal copy."""
    now = time.time()
    if not is_enforced():
        return {
            p["id"]: {"active": True, "expires_at": None, "days_left": None}
            for p in PRODUCTS
        }
    out: dict[str, dict] = {}
    for pid, exp in _entitlements.get(owner, {}).items():
        active = _active(exp)
        out[pid] = {
            "active": active,
            "expires_at": (
                time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(exp)) if exp else None
            ),
            "days_left": max(0, int((exp - now) // 86400)) if active and exp else None,
        }
    return out


def grant(owner: str, product_ids: list[str], period_days: int = PERIOD_DAYS) -> set[str]:
    """Grant or renew modules. Renewal extends from the current expiry.

    Idempotent per order at the caller (a replayed callback is ignored), but
    calling this twice with two distinct orders correctly buys two months.
    """
    if not owner or not product_ids:
        return owned_products(owner)
    now = time.time()
    owned = _entitlements.setdefault(owner, {})
    for pid in product_ids:
        current = owned.get(pid)
        start = current if current and current > now else now
        owned[pid] = start + period_days * 86400
    return owned_products(owner)


def engine_allowed(engine: str, owner: str) -> tuple[bool, str]:
    if engine in FREE_ENGINES:
        return True, "free"
    if not is_enforced():
        return True, "open mode"
    pid = ENGINE_TO_PRODUCT.get(engine)
    if pid and pid in owned_products(owner):
        return True, f"product {pid}"
    name = next((p["name"] for p in PRODUCTS if p["id"] == pid), engine)
    return False, f"Module '{name}' is not in your plan. Add it to your bundle to enable it."


def payu_enabled() -> bool:
    try:
        from app.services import payu

        return payu.enabled()
    except Exception:
        return False


def payment_provider() -> str:
    """What /billing/products reports: 'payu' when configured, else 'dev'."""
    return "payu" if payu_enabled() else "dev"


def quote(product_ids: list[str]) -> dict:
    """Price a selection, including the full-coverage discount.

    One implementation for the checkout route, the PayU amount and any
    UI that asks the API to price a bundle. Rounding is done on the
    discount, then the total is a plain subtraction, so the line items add
    up exactly.
    """
    valid = [p for p in PRODUCTS if p["id"] in set(product_ids or [])]
    if not valid:
        return {"error": "Select at least one module."}
    selected = {p["id"] for p in valid}
    subtotal = sum(p["price"] for p in valid)
    is_bundle = selected == ALL_MODULE_IDS
    discount_pct = BUNDLE_DISCOUNT_PCT if is_bundle else 0
    discount = round(subtotal * discount_pct / 100)
    return {
        "modules": [p["id"] for p in valid],
        "subtotal_inr": subtotal,
        "discount_pct": discount_pct,
        "discount_inr": discount,
        "total_inr": subtotal - discount,
        "bundle": is_bundle,
    }


def checkout(owner: str, product_ids: list[str]) -> dict:
    priced = quote(product_ids)
    if "error" in priced:
        return priced
    order_id = f"ORD-{uuid.uuid4().hex[:10].upper()}"
    order = {
        "order_id": order_id,
        "owner": owner,
        "modules": priced["modules"],
        "subtotal_inr": priced["subtotal_inr"],
        "discount_pct": priced["discount_pct"],
        "discount_inr": priced["discount_inr"],
        "total_inr": priced["total_inr"],
        "bundle": priced["bundle"],
        "status": "pending-payment",
        "created_at": time.time(),
    }
    _orders[order_id] = order
    return order


def attach_payment(order_id: str, provider_txnid: str | None = None,
                   payment_id: str | None = None) -> dict | None:
    order = _orders.get(order_id)
    if not order:
        return None
    if provider_txnid:
        order["provider_txnid"] = provider_txnid
    if payment_id:
        order["provider_payment_id"] = payment_id
    return order


def remember_order(order: dict) -> dict:
    """Adopt an order loaded from the database into the in-process cache."""
    if isinstance(order, dict) and order.get("order_id"):
        _orders[order["order_id"]] = order
    return order


def mark_paid(order_id: str, via: str = "payu") -> dict:
    """Authoritative payment confirmation.

    Only called after the gateway's signature has verified. Grants the
    order's modules to its owner. Idempotent: a second confirmation is a
    no-op.
    """
    order = _orders.get(order_id)
    if not order:
        return {"error": "Unknown order."}
    if order["status"] == "active":
        return {
            "order": order,
            "owned": sorted(owned_products(order["owner"])),
            "newly_paid": False,
        }
    order["status"] = "active"
    order["paid_via"] = via
    order["paid_at"] = time.time()
    grant(order["owner"], order["modules"])
    return {
        "order": order,
        "owned": sorted(owned_products(order["owner"])),
        "newly_paid": True,
    }


def activate(order_id: str, owner: str) -> dict:
    """Dev/simulated payment confirmation.

    Only reachable when no payment provider is configured (the route is
    hidden otherwise). A real gateway callback supersedes this.
    """
    order = _orders.get(order_id)
    if not order or order["owner"] != owner:
        return {"error": "Unknown order."}
    if order["status"] == "active":
        return {"error": "Order already active.", "order": order}
    order["status"] = "active"
    order["paid_at"] = time.time()
    grant(owner, order["modules"])
    return {"order": order, "owned": sorted(owned_products(owner))}
