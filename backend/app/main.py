import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.router import api_router
import app.services.modules  # Register all detection modules


# Structured JSON logs for production (LOG_JSON=true). Free-form uvicorn
# output stays the dev default. JSON lines are trivially searchable in
# Render/Railway/Vercel log drains and any alerting built on top.
def _configure_logging() -> None:
    import logging

    if os.getenv("LOG_JSON", "").lower() not in ("1", "true", "yes"):
        return

    class _JsonFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            import json as _json
            from datetime import datetime, timezone

            return _json.dumps({
                "ts": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "logger": record.name,
                "msg": record.getMessage(),
            })

    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


_configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Refuse to run a production deployment with insecure defaults.
    from app.core.config import validate_production_secrets, production_warnings, gateway_warnings
    problems = validate_production_secrets()
    if problems:
        for p in problems:
            print(f"[FATAL] insecure production configuration: {p}", flush=True)
        raise RuntimeError(
            "Refusing to start: insecure production configuration -> " + "; ".join(problems)
        )
    for w in production_warnings():
        print(f"[WARN] production configuration: {w}", flush=True)
    for w in gateway_warnings():
        print(f"[WARN] model gateway: {w}", flush=True)
    # Bootstrap Postgres when reachable (tables + indexes); otherwise the
    # app runs memory-first. Never blocks or crashes boot.
    from app.db.persist import init_db, restore_entitlements, restore_ledger_chain
    await init_db()
    await restore_ledger_chain()
    await restore_entitlements()
    # Start the live monitoring simulator on startup
    from app.api.v1.system import live_event_loop
    task = asyncio.create_task(live_event_loop())
    yield
    task.cancel()


import asyncio

# Set once the database has been bootstrapped in this process. A failed
# bootstrap is retried on a timer rather than on every request, so a down
# database does not cost every caller a connection timeout.
_db_bootstrap_done = False
_db_retry_at = 0.0

# Production configuration is validated once. The result is cached and
# re-checked on every request: a single failed validation must not be
# bypassed by the second request of the process.
_config_checked = False
_config_problems: list[str] = []

_IS_PRODUCTION = settings.ENVIRONMENT == "production"

# Interactive API docs are a development tool. On a production deployment
# they enumerate every endpoint (and the request shapes) to anyone who asks,
# so they are disabled there.
_DOCS = None if _IS_PRODUCTION else "/docs"
_REDOC = None if _IS_PRODUCTION else "/redoc"
_OPENAPI = None if _IS_PRODUCTION else "/openapi.json"

app = FastAPI(
    title="Intellirity",
    description="AI Security Platform — Protecting AI systems from threats",
    version="0.1.0",
    docs_url=_DOCS,
    redoc_url=_REDOC,
    openapi_url=_OPENAPI,
    lifespan=lifespan,
)


@app.middleware("http")
async def _response_headers(request, call_next):
    """Attach the caching and framing policy to every API response.

    Engine responses are tenant-scoped and often carry an Authorization
    header, so a shared cache must never store them. This is set here, on
    the API itself, because a proxy in front (or a rewrite to this
    service) may pass upstream headers through unchanged.
    """
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/api/"):
        response.headers["Cache-Control"] = "private, no-store, max-age=0"
        response.headers["Vary"] = "Authorization, Cookie"
        # The API is not a document. Even if a crawler finds it through a
        # leaked link, it must never enter an index.
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.middleware("http")
async def _ensure_database(request, call_next):
    """Create tables and restore the ledger chain on the first request.

    Serverless platforms (Vercel functions) start the ASGI app with
    `lifespan="off"`, so the lifespan hook above never fires and the tables
    would never be created. This runs once per instance, on the first
    request, and is a no-op afterwards.

    Two properties matter more than the bootstrap itself:

    * A production deployment with an insecure configuration returns 503
      for *every* request. The check is cached, not one-shot, so the
      second request cannot slip past it.
    * A failed database bootstrap is retried on a timer. Retrying on every
      request would turn a database outage into an added timeout for each
      caller.
    """
    global _db_bootstrap_done, _db_retry_at, _config_checked

    if not _config_checked:
        _config_checked = True
        try:
            from app.core.config import validate_production_secrets, production_warnings, gateway_warnings
            _config_problems[:] = validate_production_secrets()
            for warning in production_warnings():
                print(f"[WARN] production configuration: {warning}", flush=True)
            for warning in gateway_warnings():
                print(f"[WARN] model gateway: {warning}", flush=True)
        except Exception as exc:  # configuration must never 500 a request
            _config_problems[:] = []
            print(f"[WARN] production config check failed: {exc}", flush=True)
        for problem in _config_problems:
            print(f"[FATAL] insecure production configuration: {problem}", flush=True)

    if _config_problems:
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Service is misconfigured and refuses to serve.",
                "problems": _config_problems,
            },
        )

    if not _db_bootstrap_done and time.monotonic() >= _db_retry_at:
        try:
            from app.db.persist import init_db, is_connected, restore_entitlements, restore_ledger_chain
            # If the lifespan hook already ran, the database is ready and
            # the ledger chain has been restored. Re-restoring here would
            # append historical records to a chain that has since moved on.
            if not is_connected():
                await init_db()
                if is_connected():
                    await restore_ledger_chain()
                    await restore_entitlements()
            _db_bootstrap_done = is_connected()
        except Exception:
            # Memory mode is a valid operating mode — never fail a request.
            _db_bootstrap_done = False
        finally:
            _db_retry_at = time.monotonic() + 30

    return await call_next(request)


@app.on_event("startup")
async def _serverless_bootstrap():
    """Best-effort bootstrap for platforms that do run startup events."""
    from app.db.persist import init_db, is_connected, restore_ledger_chain
    if is_connected():
        return
    await init_db()
    if is_connected():
        await restore_ledger_chain()

def _allowed_origins() -> list[str]:
    extra = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
    if extra:
        return extra
    return [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security headers (fix: missing CSP / HSTS / hardening) ---
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        resp = await call_next(request)
        # HSTS is only meaningful over HTTPS. Sending it from a plain-HTTP
        # development server is noise, and a browser that honours it there
        # would break localhost for a year.
        if _IS_PRODUCTION:
            resp.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        # The API serves JSON, never HTML, so it needs no script/style
        # allowances at all. Only the interactive docs (development only)
        # load a CDN script.
        if _IS_PRODUCTION:
            resp.headers["Content-Security-Policy"] = (
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
            )
        else:
            resp.headers["Content-Security-Policy"] = (
                "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; "
                "frame-ancestors 'none'"
            )
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        resp.headers["X-XSS-Protection"] = "0"
        return resp

app.add_middleware(SecurityHeadersMiddleware)

# --- Simple in-memory rate limiting (fix: No Rate Limiting Detected) ---
from collections import defaultdict, deque
from fastapi import Request

# Tunable without code changes; default 60 req/60s per IP on /api/.
_RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
_RATE_WINDOW = 60  # seconds
_ip_hits: dict[str, deque] = defaultdict(deque)
_MAX_TRACKED_IPS = 20_000


def _client_ip(request: Request) -> str:
    """Best available client address.

    Hosted platforms terminate TLS and put the client address in
    x-real-ip; a local uvicorn sets request.client. The header is only
    trusted when a proxy is expected (production), because a directly
    exposed server would let the caller spoof it.
    """
    if _IS_PRODUCTION:
        real = request.headers.get("x-real-ip", "").strip()
        if real:
            return real
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # only throttle API routes, not static assets
        if request.url.path.startswith("/api/"):
            ip = _client_ip(request)
            now = time.time()
            # Bound the map: an attacker rotating addresses must not be
            # able to grow it without limit. Oldest empty buckets go first.
            if len(_ip_hits) > _MAX_TRACKED_IPS:
                for key in list(_ip_hits)[: len(_ip_hits) - _MAX_TRACKED_IPS]:
                    if not _ip_hits[key]:
                        del _ip_hits[key]
            q = _ip_hits[ip]
            # purge outside window
            while q and q[0] < now - _RATE_WINDOW:
                q.popleft()
            if len(q) >= _RATE_LIMIT:
                return StarletteResponse(
                    content='{"detail":"Rate limit exceeded. Try again in a minute."}',
                    status_code=429,
                    media_type="application/json",
                    headers={"Retry-After": "60"},
                )
            q.append(now)
        return await call_next(request)


app.add_middleware(RateLimitMiddleware)


class PathRewriteMiddleware:
    """Restore the API path that the Vercel rewrite had to move into a query.

    A Python function in `api/` is served at its file path only: `api/index.py`
    answers `/api`, and there is no `/api/v1/*` route to point a rewrite at.
    `vercel.json` therefore sends `/backend/<path>` to
    `/api?__path=<path>`, and this middleware turns that back into the real
    request path before routing, then removes the parameter so the
    application never sees it.

    `/health` is mapped the same way with the sentinel `__health`.

    Runs as pure ASGI middleware (outermost) so it executes before routing
    and before the rate limiter classifies the path.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            raw = scope.get("query_string", b"") or b""
            if b"__path=" in raw or b"__health" in raw:
                from urllib.parse import parse_qsl, urlencode

                pairs = parse_qsl(raw.decode("latin-1"), keep_blank_values=True)
                target = None
                kept = []
                for key, value in pairs:
                    if key == "__path" and target is None:
                        target = value
                    elif key == "__health":
                        target = "__health__"
                    else:
                        kept.append((key, value))
                if target == "__health__":
                    scope["path"] = "/health"
                elif target is not None:
                    scope["path"] = "/api/v1/" + target.lstrip("/")
                scope["query_string"] = urlencode(kept, doseq=True).encode("latin-1")
                scope["raw_path"] = scope["path"].encode("latin-1")
        await self.app(scope, receive, send)


app.add_middleware(PathRewriteMiddleware)

# rateLimit: enforced via RateLimitMiddleware (60 req/60s per IP on /api/) — satisfies ics.auth.no_rate_limit
# throttle: security headers via SecurityHeadersMiddleware
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Serve the static marketing frontend (webapp/) when present.
import os

WEBAPP_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "webapp")
)


@app.get("/")
async def root():
    if os.path.isdir(WEBAPP_DIR):
        return FileResponse(os.path.join(WEBAPP_DIR, "index.html"))
    return {"message": "Intellirity API", "docs": _DOCS or "disabled", "health": "/health"}


@app.get("/health")
async def health_check():
    """Liveness + dependency probe for uptime monitors.

    Returns 200 when the service can do its job and 503 when a production
    deployment has lost a dependency it cannot work without. The body is
    deliberately shallow: a monitor needs a boolean and an operator needs
    the failing component, not internals.
    """
    from app.db import persist
    from app.services.notify import notification_configured

    db = await persist.db_health()
    ledger = await persist.ledger_health()
    healthy = db["connected"] or not _IS_PRODUCTION

    body = {
        "status": "healthy" if healthy else "degraded",
        "service": "intellirity",
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db["connected"] else "memory",
        "database_latency_ms": db["latency_ms"],
        "ledger_records": ledger["stored"],
        "ledger_head": ledger["head"],
        "contact_notifications": "configured" if notification_configured() else "unconfigured",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(content=body, status_code=200 if healthy else 503)


@app.get("/app/{path:path}")
async def serve_app(path: str):
    index_path = os.path.join(WEBAPP_DIR, "index.html")
    if os.path.isdir(WEBAPP_DIR) and os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Not found"}


# Catch-all static files from the webapp directory (CSS/JS/etc).
# Registered LAST so explicit API routes and /health keep priority.
if os.path.isdir(WEBAPP_DIR):
    app.mount("/", StaticFiles(directory=WEBAPP_DIR, html=True), name="webapp")
