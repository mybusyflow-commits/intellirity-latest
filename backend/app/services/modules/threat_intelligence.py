from datetime import datetime, timezone
from app.services.feature_registry import register_feature


THREAT_INTELLIGENCE_DB = [
    {
        "id": "threat_001",
        "type": "jailbreak",
        "name": "DAN 6.0 Variant",
        "description": "New DAN variant using multi-turn conversation to gradually weaken safety constraints.",
        "severity": "high",
        "first_seen": "2026-07-15",
        "indicators": ["multi-turn persona shift", "gradual constraint relaxation"],
    },
    {
        "id": "threat_002",
        "type": "prompt_injection",
        "name": "Context Window Overflow Attack",
        "description": "Overloading context window to push safety instructions out of model attention span.",
        "severity": "medium",
        "first_seen": "2026-06-20",
        "indicators": ["extremely long input", "repetitive padding patterns"],
    },
    {
        "id": "threat_003",
        "type": "data_leakage",
        "name": "Training Data Extraction via Padded Prompts",
        "description": "Using specific prompt patterns to extract memorized training data from LLMs.",
        "severity": "high",
        "first_seen": "2026-07-01",
        "indicators": ["repetitive prefix attack", "completion probing"],
    },
]


@register_feature(
    key="threat_intelligence_feed",
    name="Threat Intelligence Feed",
    description="Live feed of new AI attack patterns shared across all customers. Stay ahead of emerging threats.",
    tier="enterprise",
)
def threat_intelligence_feed(payload: dict) -> dict:
    feed_type = payload.get("type", "all")
    severity_filter = payload.get("severity")
    limit = payload.get("limit", 10)

    results = THREAT_INTELLIGENCE_DB

    if feed_type != "all":
        results = [t for t in results if t["type"] == feed_type]

    if severity_filter:
        results = [t for t in results if t["severity"] == severity_filter]

    results = results[:limit]

    return {
        "feed_updated": datetime.now(timezone.utc).isoformat(),
        "total_threats": len(results),
        "threats": results,
        "subscription_tier": "enterprise",
        "message": f"Showing {len(results)} threat intelligence entries.",
    }
