import re
from app.services.feature_registry import register_feature


# Severe profanity seed list (kept short on purpose: only high-severity
# terms score here; mild language is left alone to keep false positives low).
SEVERE_PROFANITY = [
    "fuck", "shit", "bitch", "bastard", "dickhead", "motherfucker",
    "cunt", "whore", "slut",
]

VIOLENT_THREAT_PATTERNS = [
    r"(?:kill|murder|stab|shoot|strangle|behead|decapitate)\s+(?:you|u|them|him|her|those\s+people)",
    r"(?:i\s+(?:will|gonna|going\s+to)\s+(?:kill|murder|hurt|harm|attack|stab|shoot)\s+(?:you|u|them|him|her))",
    r"(?:bomb|explosive|molotov)\s+(?:instructions?|guide|manual|recipe|how\s*to|directions?)",
    r"(?:how\s+to\s+(?:make|build)\s+(?:a\s+)?(?:bomb|explosive|molotov|weapon|gun|poison))",
    r"(?:threaten|threatening)\s+(?:to\s+)?(?:kill|hurt|harm|dox|swat)",
    r"(?:school|mass)\s+shooting\s+(?:threat|plan|guide|instructions?)",
]

SELF_HARM_PATTERNS = [
    r"(?:kill|hurt|cut|harm)\s+(?:yourself|myself|themselves)",
    r"suicide\s+(?:methods?|guide|how\s*to|instructions?|tips?)",
    r"(?:want|going|plan)\s+to\s+(?:kill|end)\s+(?:myself|my\s+life|it\s+all)",
    r"self[\s-]?harm\s+(?:methods?|guide|how\s*to|instructions?|tips?)",
]

HATE_PATTERNS = [
    r"(?:hate|kill|exterminate|deport|gas)\s+all\s+(?:jews|muslims|christians|arabs|blacks|whites|asians|migrants|immigrants|gays|women|men)",
    r"(?:ethnic\s+cleansing|racial\s+purity|white\s+power)\b",
]


@register_feature(
    key="content_moderation",
    name="Content Moderation",
    description="Screens prompts and responses for severe profanity, violent threats, self-harm encouragement, and hate targeting. Layered severity scoring keeps mild language unflagged.",
    tier="professional",
)
def content_moderation(payload: dict) -> dict:
    text = payload.get("text", "")
    direction = payload.get("direction", "input")

    if not text or not isinstance(text, str):
        return {
            "verdict": "allow",
            "risk_score": 0.0,
            "direction": direction,
            "findings": [],
            "recommendation": "No text provided for analysis.",
        }

    lowered = text.lower()
    findings = []
    risk_score = 0.0

    profanity_hits = sorted({w for w in SEVERE_PROFANITY if re.search(rf"\b{re.escape(w)}\b", lowered)})
    if profanity_hits:
        findings.append(f"Severe profanity detected: {', '.join(profanity_hits[:5])}")
        risk_score += 0.2

    for pattern in VIOLENT_THREAT_PATTERNS:
        if re.search(pattern, lowered):
            findings.append(f"Violent threat pattern: {pattern[:60]}...")
            risk_score += 0.7
            break

    for pattern in SELF_HARM_PATTERNS:
        if re.search(pattern, lowered):
            findings.append("Self-harm encouragement pattern detected")
            risk_score += 0.7
            break

    for pattern in HATE_PATTERNS:
        if re.search(pattern, lowered):
            findings.append("Hate targeting pattern detected")
            risk_score += 0.7
            break

    risk_score = min(risk_score, 1.0)
    if risk_score >= 0.7:
        verdict = "block"
    elif risk_score >= 0.3:
        verdict = "flag"
    else:
        verdict = "allow"

    return {
        "verdict": verdict,
        "risk_score": round(risk_score, 3),
        "direction": direction,
        "findings": findings,
        "recommendation": (
            "Blocked: content violates safety policy. Return a safe completion."
            if verdict == "block" else
            "Flagged: review before delivering to the user."
            if verdict == "flag" else
            "Content appears safe. Continue with standard processing."
        ),
    }
