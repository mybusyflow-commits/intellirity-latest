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

SPAM_PATTERNS = [
    r"(?:congratulations|congrats)[!.]?\s+you(?:'ve| have)\s+(?:won|been\s+selected)",
    r"(?:free\s+(?:prize|gift|money|crypto|iphone)|claim\s+(?:your\s+)?(?:prize|reward|winnings?))",
    r"(?:click\s+here|act\s+now|limited\s+(?:time\s+)?offer).{0,40}(?:claim|prize|winner|free)",
    r"(?:double|triple)\s+your\s+(?:crypto|bitcoin|btc|eth|money)",
    r"(?:verify|suspend|locked).{0,30}(?:account|payment|bank).{0,30}(?:immediately|within\s+24|urgent)",
    r"(?:dear\s+beneficiary|inheritance|fund\s+release|wire\s+transfer).{0,30}(?:million|usd\s+[0-9])",
]

SEXUAL_PATTERNS = [
    r"\b(?:porn|xxx|hentai|escort\s+service|sex\s+worker\s+directory)\b",
    r"(?:explicit|graphic)\s+sexual\s+(?:content|description|instructions?)",
]

# Any sexual framing around a minor is an instant block.
MINOR_SAFETY_PATTERNS = [
    r"(?:child|minor|kid|teen|underage|young\s+(?:boy|girl))[^.]{0,60}(?:sex|sexual|nude|naked|explicit|porn)",
    r"(?:sex|sexual|nude|naked|explicit|porn)[^.]{0,60}(?:child|minor|kid|teen|underage|young\s+(?:boy|girl))",
]

HARASSMENT_PATTERNS = [
    r"you\s+(?:are|r)\s+(?:worthless|pathetic|a\s+loser|disgusting|a\s+failure|nothing)",
    r"(?:nobody|no\s+one)\s+(?:likes|loves|cares\s+about)\s+you",
    r"(?:shut\s+up|kill\s+yourself|kys|go\s+die)\b",
]


@register_feature(
    key="content_moderation",
    name="Content Moderation",
    description="Screens prompts and responses across 7 categories: spam/scam, sexual content, minor safety, severe profanity, violent threats, self-harm, and hate/harassment. Layered severity scoring keeps mild language unflagged.",
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

    def hit(category: str, severity: str, detail: str, score: float):
        findings.append({
            "category": category,
            "severity": severity,
            "detail": detail,
            "score": score,
        })
        return score

    for pattern in MINOR_SAFETY_PATTERNS:
        if re.search(pattern, lowered):
            risk_score += hit("sexual", "critical", "Minor-safety: sexual framing around a minor", 1.0)
            break

    for pattern in SEXUAL_PATTERNS:
        if re.search(pattern, lowered):
            risk_score += hit("sexual", "high", "Severe sexual content detected", 0.7)
            break

    for pattern in SPAM_PATTERNS:
        if re.search(pattern, lowered):
            risk_score += hit("spam", "medium", "Spam/scam pattern detected", 0.5)
            break

    profanity_hits = sorted({w for w in SEVERE_PROFANITY if re.search(rf"\b{re.escape(w)}\b", lowered)})
    if profanity_hits:
        risk_score += hit("abuse", "medium", f"Severe profanity detected: {', '.join(profanity_hits[:5])}", 0.2)

    for pattern in VIOLENT_THREAT_PATTERNS:
        if re.search(pattern, lowered):
            risk_score += hit("violence", "high", "Violent threat pattern detected", 0.7)
            break

    for pattern in SELF_HARM_PATTERNS:
        if re.search(pattern, lowered):
            risk_score += hit("self-harm", "high", "Self-harm encouragement pattern detected", 0.7)
            break

    for pattern in HATE_PATTERNS:
        if re.search(pattern, lowered):
            risk_score += hit("abuse", "high", "Hate targeting pattern detected", 0.7)
            break

    for pattern in HARASSMENT_PATTERNS:
        if re.search(pattern, lowered):
            risk_score += hit("abuse", "medium", "Targeted harassment detected", 0.5)
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
