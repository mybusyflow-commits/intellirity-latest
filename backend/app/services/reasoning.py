import logging
import os
import time
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

# Any OpenAI-compatible gateway works here. Default is the OpenCode Zen
# OpenAI-compatible endpoint.
BASE_URL = os.getenv("OPENCODEZEN_BASE_URL", "https://opencode.ai/zen/v1").rstrip("/")

# Optional explicit model. When empty we discover what the gateway offers.
DEFAULT_MODEL = os.getenv("OPENCODEZEN_MODEL", "").strip()

# Free-tier model ids we prefer, in order. The gateway rotates its catalogue,
# so this list is a *preference* only — live discovery overrides it.
PREFERRED_FREE_MODELS = [
    "space-bunny-free",
    "beam-free",
    "mimo-v2.6-flash-free",
    "nemotron-3.5-lightning-free",
    "deepseek-v4.1-flash-free",
    "glm-5.3-flash-free",
    "minimax-m3.1-flash-free",
]

# Display-name -> actual API model id mapping.
_MODEL_ALIASES = {
    "space bunny (free)": "space-bunny-free",
    "space bunny": "space-bunny-free",
    "space-bunny-free": "space-bunny-free",
    "beam (free)": "beam-free",
    "beam": "beam-free",
    "beam-free": "beam-free",
    "mimo v2.6 flash (free)": "mimo-v2.6-flash-free",
    "mimo-v2.6-flash-free": "mimo-v2.6-flash-free",
    "mimo": "mimo-v2.6-flash-free",
    "minimax m3.1 flash (free)": "minimax-m3.1-flash-free",
    "minimax-m3.1-flash-free": "minimax-m3.1-flash-free",
    "nemotron 3.5 lightning (free)": "nemotron-3.5-lightning-free",
    "nemotron-3.5-lightning-free": "nemotron-3.5-lightning-free",
    "deepseek v4.1 flash (free)": "deepseek-v4.1-flash-free",
    "deepseek-v4.1-flash-free": "deepseek-v4.1-flash-free",
    "glm 5.3 flash (free)": "glm-5.3-flash-free",
    "glm-5.3-flash-free": "glm-5.3-flash-free",
}

# Discovery cache: gateway catalogues rotate, so re-check every 10 minutes.
_MODEL_CACHE: dict[str, tuple[float, list[str]]] = {}
_MODEL_CACHE_TTL = 600.0


def _resolve_model(model: str) -> str:
    key = (model or "").strip().lower()
    return _MODEL_ALIASES.get(key, model)


def _extract_error_detail(resp) -> str:
    """Pull a human-readable reason out of a gateway error body."""
    try:
        body = resp.json()
    except Exception:
        body = None
    if isinstance(body, dict):
        err = body.get("error")
        if isinstance(err, dict):
            msg = err.get("message") or err.get("type")
            if msg:
                return str(msg)
        if isinstance(err, str):
            return err
        if body.get("message"):
            return str(body["message"])
    text = (resp.text or "").strip()
    return text[:200]


async def _discover_models(client: httpx.AsyncClient) -> list[str]:
    """Ask the gateway which models it currently serves."""
    cached = _MODEL_CACHE.get(BASE_URL)
    now = time.time()
    if cached and now - cached[0] < _MODEL_CACHE_TTL:
        return cached[1]
    try:
        resp = await client.get(f"{BASE_URL}/models", headers={"Authorization": f"Bearer {API_KEY}"}, timeout=20.0)
        if resp.status_code == 200:
            data = resp.json()
            ids = [m.get("id") for m in (data.get("data") or []) if isinstance(m, dict) and m.get("id")]
            if ids:
                _MODEL_CACHE[BASE_URL] = (now, ids)
                return ids
    except Exception as exc:
        logger.warning("model discovery failed: %s", str(exc)[:160])
    return cached[1] if cached else []


def _candidate_models(target: str, discovered: list[str]) -> list[str]:
    """Ordered candidates: explicit target first, then free tier, then the
    rest of the catalogue. We never call a paid model the user did not ask
    for unless the free list is empty and discovery shows nothing free."""
    free_discovered = [m for m in discovered if m.endswith("-free")]
    ordered: list[str] = []
    for m in [target, *PREFERRED_FREE_MODELS, *free_discovered]:
        if m and m not in ordered:
            ordered.append(m)
    if DEFAULT_MODEL and DEFAULT_MODEL not in ordered:
        ordered.insert(0, DEFAULT_MODEL)
    # Final fallback: any model the gateway actually serves, so a paid
    # gateway with no free tier (Groq, OpenAI) works out of the box once
    # its key is set. Free models still win when present.
    for m in discovered:
        if m and m not in ordered:
            ordered.append(m)
    return ordered


async def pick_model(requested: str = "") -> str:
    """Resolve a model id against the gateway's live catalogue.

    Gateway catalogues rotate (ids get deprecated), so a hardcoded id can be
    dead. When the requested id is not served, fall back to a live free model.
    """
    target = _resolve_model(requested) if requested else (DEFAULT_MODEL or "")
    async with httpx.AsyncClient(timeout=20.0) as client:
        discovered = await _discover_models(client)
    if not discovered:
        return target or (PREFERRED_FREE_MODELS[0] if PREFERRED_FREE_MODELS else "")
    if target and target in discovered:
        return target
    live_free = [m for m in discovered if m.endswith("-free")]
    for preferred in PREFERRED_FREE_MODELS:
        if preferred in live_free:
            return preferred
    return live_free[0] if live_free else (target or discovered[0])


async def reason(prompt: str, model: str = "space bunny (free)") -> str:
    """Return the model's text reply, degrading gracefully on any failure."""
    if not prompt or not isinstance(prompt, str):
        return "[reasoning unavailable] Empty prompt provided."

    if not API_KEY:
        return "[reasoning unavailable] No API key configured. Set OPENCODEZEN_API_KEY to enable."

    target = _resolve_model(model)
    url = f"{BASE_URL}/chat/completions"

    errors: list[str] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        discovered = await _discover_models(client)
        for mdl in _candidate_models(target, discovered):
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
                        errors.append(f"unexpected response format from {mdl}")
                        continue
                    if content:
                        return content
                    errors.append(f"empty completion from {mdl}")
                    continue
                detail = _extract_error_detail(resp)
                errors.append(f"{mdl}: HTTP {resp.status_code} {detail}")
            except Exception as e:  # noqa: BLE001
                errors.append(f"{mdl}: {type(e).__name__} {str(e)[:120]}")
                logger.warning("reasoning call failed: %s", errors[-1])

    # Report the distinct failure modes, not just the last one — the first
    # error is usually the real reason (404 = bad model, 402 = no funds,
    # 403 = free tier is CLI-only).
    seen: list[str] = []
    for e in errors:
        if e not in seen:
            seen.append(e)
    return "[reasoning unavailable] " + " | ".join(seen[:4])


async def reason_detail(prompt: str, model: str = "space bunny (free)") -> dict:
    """Same as reason() but also reports whether the upstream was reachable.

    Used by the API so the client can tell "gateway down" from "no credit".
    """
    text = await reason(prompt, model)
    available = not text.startswith("[reasoning unavailable]")
    return {
        "reasoning": text,
        "available": available,
        "model": _resolve_model(model),
        "base_url": BASE_URL,
    }
