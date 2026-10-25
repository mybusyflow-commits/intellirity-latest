"""Per-module products, entitlements, and checkout stubs.

Nine purchasable modules. Basics at Rs 79/99, the trust core
(escrow/ledger/VPI) at Rs 299/399. One customizable plan: buyers pick
modules, pay the sum. A real payment provider (Razorpay/Stripe) confirms
orders later; until then checkout records a pending order and a dev
activate endpoint simulates payment confirmation.

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

# Engines free for everyone even when enforcement is on.
FREE_ENGINES = {"threat_intelligence_feed"}

ENGINE_TO_PRODUCT = {}
for _p in PRODUCTS:
    for _e in _p["engines"]:
        ENGINE_TO_PRODUCT[_e] = _p["id"]

# owner -> set(product_id). Memory-first like the rest of the dev stack.
_entitlements: dict[str, set[str]] = {}
_orders: dict[str, dict] = {}


def is_enforced() -> bool:
    return os.getenv("BILLING_ENFORCED", "").lower() in ("1", "true", "yes")


def owned_products(owner: str) -> set[str]:
    if not is_enforced():
        return {p["id"] for p in PRODUCTS}
    return set(_entitlements.get(owner, set()))


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


def razorpay_enabled() -> bool:
    try:
        from app.services import razorpay

        return razorpay.enabled()
    except Exception:
        return False


def checkout(owner: str, product_ids: list[str]) -> dict:
    valid = [p for p in PRODUCTS if p["id"] in set(product_ids or [])]
    if not valid:
        return {"error": "Select at least one module."}
    total = sum(p["price"] for p in valid)
    order_id = f"ORD-{uuid.uuid4().hex[:10].upper()}"
    order = {
        "order_id": order_id,
        "owner": owner,
        "modules": [p["id"] for p in valid],
        "total_inr": total,
        "status": "pending-payment",
        "created_at": time.time(),
    }
    _orders[order_id] = order
    return order


def attach_payment(order_id: str, razorpay_order_id: str | None = None,
                   payment_id: str | None = None) -> dict | None:
    order = _orders.get(order_id)
    if not order:
        return None
    if razorpay_order_id:
        order["razorpay_order_id"] = razorpay_order_id
    if payment_id:
        order["razorpay_payment_id"] = payment_id
    return order


def mark_paid(order_id: str, via: str = "razorpay") -> dict:
    """Authoritative payment confirmation.

    Only called after a Razorpay signature has verified. Grants the order's
    modules to its owner. Idempotent: a second confirmation is a no-op.
    """
    order = _orders.get(order_id)
    if not order:
        return {"error": "Unknown order."}
    if order["status"] == "active":
        return {"order": order, "owned": sorted(_entitlements.get(order["owner"], set()))}
    order["status"] = "active"
    order["paid_via"] = via
    _entitlements.setdefault(order["owner"], set()).update(order["modules"])
    return {"order": order, "owned": sorted(_entitlements[order["owner"]])}


def activate(order_id: str, owner: str) -> dict:
    """Dev/simulated payment confirmation.

    Only reachable when Razorpay is NOT configured (the activate route is
    hidden otherwise). A real provider webhook supersedes this in production.
    """
    order = _orders.get(order_id)
    if not order or order["owner"] != owner:
        return {"error": "Unknown order."}
    if order["status"] == "active":
        return {"error": "Order already active.", "order": order}
    order["status"] = "active"
    _entitlements.setdefault(owner, set()).update(order["modules"])
    return {"order": order, "owned": sorted(_entitlements[owner])}
