from typing import Callable, Any

FEATURE_REGISTRY: dict[str, dict[str, Any]] = {}


def register_feature(key: str, name: str, description: str, tier: str = "free"):
    def decorator(func: Callable):
        FEATURE_REGISTRY[key] = {
            "name": name,
            "description": description,
            "tier": tier,
            "function": func,
        }
        return func
    return decorator


def check_entitlement(module_id: str, customer_features: list[str] | None = None) -> dict:
    if module_id not in FEATURE_REGISTRY:
        return {"allowed": False, "message": f"Unknown module: {module_id}"}

    feature = FEATURE_REGISTRY[module_id]

    if feature["tier"] == "free":
        return {"allowed": True, "message": "Access granted"}

    if customer_features and module_id in customer_features:
        return {"allowed": True, "message": "Access granted"}

    return {
        "allowed": False,
        "message": f"Your plan does not include '{feature['name']}'. Upgrade to enable it.",
    }


def get_customer_features() -> list[str]:
    return list(FEATURE_REGISTRY.keys())
