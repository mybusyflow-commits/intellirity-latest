import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("intellirity.reasoning")

# Secret key read from env ONLY. Never hardcode keys in source.
# Set OPENCODEZEN_API_KEY in your environment or backend/.env file.
def _load_api_key() -> str:
    key = os.getenv("OPENCODEZEN_API_KEY", "")
    if key:
        return key
    try:
        from app.core.config import settings
        return settings.OPENCODEZEN_API_KEY or ""
    except Exception:
        return ""


API_KEY = _load_api_key()

# Configurable base URL; defaults to the OpenCode Zen OpenAI-compatible endpoint.
BASE_URL = os.getenv("OPENCODEZEN_BASE_URL", "https://opencode.ai/zen/v1").rstrip("/")

# Display-name -> actual API model id mapping (verified against /models
# plus live inference probes; space-bunny-free is the confirmed-working default).
_MODEL_ALIASES = {
    "space bunny (free)": "space-bunny-free",
    "space bunny": "space-bunny-free",
    "space-bunny-free": "space-bunny-free",
    "mimo v2.5 (free)": "mimo-v2.5-free",
    "mimo v2.5(free)": "mimo-v2.5-free",
    "mimo v2.5": "mimo-v2.5-free",
    "mimo-v2.5-free": "mimo-v2.5-free",
    "mimo": "mimo-v2.5-free",
    "mimo v2.6 flash (free)": "mimo-v2.6-flash-free",
    "mimo-v2.6-flash-free": "mimo-v2.6-flash-free",
    "ling 3.1 flash (free)": "ling-3.1-flash-free",
    "ling-3.1-flash-free": "ling-3.1-flash-free",
    "fledge alpha (free)": "fledge-alpha-free",
    "fledge-alpha-free": "fledge-alpha-free",
}

# The only models we are allowed to use (primary first, rest are fallbacks).
FREE_MODELS = ["space-bunny-free", "mimo-v2.5-free", "mimo-v2.6-flash-free", "ling-3.1-flash-free", "fledge-alpha-free"]

# Fallback base URLs to probe if the primary is unreachable.
_FALLBACK_BASES = [
    "https://opencode.ai/inference/openai/v1",
    "https://api.opencode.ai/zen/v1",
]


def _resolve_model(model: str) -> str:
    key = (model or "").strip().lower()
    return _MODEL_ALIASES.get(key, model)


async def reason(prompt: str, model: str = "space bunny (free)") -> str:
    """Return the model's text reply, degrading gracefully on any failure."""
    if not prompt or not isinstance(prompt, str):
        return "[reasoning unavailable] Empty prompt provided."

    if not API_KEY:
        return "[reasoning unavailable] No API key configured. Set OPENCODEZEN_API_KEY to enable."

    target = _resolve_model(model)
    candidates = [target] + [m for m in FREE_MODELS if m != target]

    bases = [BASE_URL] + [b for b in _FALLBACK_BASES if b.rstrip("/") != BASE_URL]

    last_error = "no endpoints attempted"
    async with httpx.AsyncClient(timeout=30.0) as client:
        for base in bases:
            url = f"{base.rstrip('/')}/chat/completions"
            for mdl in candidates:
                try:
                    resp = await client.post(
                        url,
                        headers={
                            "Authorization": f"Bearer {API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": mdl,
                            "messages": [{"role": "user", "content": prompt}],
                            "max_tokens": 512,
                            "stream": False,
                        },
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        try:
                            content = (data["choices"][0]["message"]["content"] or "").strip()
                        except (KeyError, IndexError, TypeError):
                            last_error = f"Unexpected response format from {mdl} @ {base}: {data}"
                            continue
                        if content:
                            return content
                        # Empty completion: treat as a soft failure and try the next candidate.
                        last_error = f"Empty completion from {mdl} @ {base}"
                        continue
                    last_error = f"HTTP {resp.status_code} from {mdl}: {resp.text[:300]}"
                except Exception as e:  # noqa: BLE001
                    last_error = f"{type(e).__name__} ({mdl} @ {base}): {e}"
                    logger.warning("reasoning call failed: %s", last_error)
                    continue
    return f"[reasoning unavailable] {last_error}"
