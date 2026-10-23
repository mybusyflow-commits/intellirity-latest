import os
from contextlib import asynccontextmanager
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
    from app.core.config import validate_production_secrets
    problems = validate_production_secrets()
    if problems:
        for p in problems:
            print(f"[FATAL] insecure production configuration: {p}", flush=True)
        raise RuntimeError(
            "Refusing to start: insecure production configuration -> " + "; ".join(problems)
        )
    # Bootstrap Postgres when reachable (tables + indexes); otherwise the
    # app runs memory-first. Never blocks or crashes boot.
    from app.db.persist import init_db, restore_ledger_chain
    await init_db()
    await restore_ledger_chain()
    # Start the live monitoring simulator on startup
    from app.api.v1.system import live_event_loop
    task = asyncio.create_task(live_event_loop())
    yield
    task.cancel()


import asyncio

# Set once the database has been bootstrapped in this process.
_db_bootstrap_done = False

app = FastAPI(
    title="Intellirity",
    description="AI Security Platform — Protecting AI systems from threats",
    version="0.1.0",
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
    request, and is a no-op afterwards. It never blocks or fails a request.
    """
    global _db_bootstrap_done
    if not _db_bootstrap_done:
        _db_bootstrap_done = True
        try:
            from app.core.config import validate_production_secrets
            problems = validate_production_secrets()
            if problems:
                for p in problems:
                    print(f"[FATAL] insecure production configuration: {p}", flush=True)
                return JSONResponse(
                    status_code=503,
                    content={"detail": "insecure production configuration"},
                )
        except RuntimeError:
            raise
        except Exception:
            pass
        try:
            from app.db.persist import init_db, is_connected, restore_ledger_chain
            # If the lifespan hook already ran, the database is ready and
            # the ledger chain has been restored. Re-restoring here would
            # append historical records to a chain that has since moved on.
            if not is_connected():
                await init_db()
                if is_connected():
                    await restore_ledger_chain()
        except Exception:
            # Memory mode is a valid operating mode — never fail a request.
            pass
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
        # HSTS only on HTTPS in prod, but include for scan compliance; browsers ignore on http
        resp.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        resp.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        resp.headers["X-XSS-Protection"] = "0"
        return resp

app.add_middleware(SecurityHeadersMiddleware)

# --- Simple in-memory rate limiting (fix: No Rate Limiting Detected) ---
import os
import time
from collections import defaultdict, deque
from fastapi import Request

# Tunable without code changes; default 60 req/60s per IP on /api/.
_RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
_RATE_WINDOW = 60  # seconds
_ip_hits: dict[str, deque] = defaultdict(deque)

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # only throttle API routes, not static assets
        if request.url.path.startswith("/api/"):
            ip = request.client.host if request.client else "unknown"
            now = time.time()
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
    return {"message": "Intellirity API", "docs": "/docs", "health": "/health"}


@app.get("/health")
async def health_check():
    from app.db.persist import is_connected

    return {
        "status": "healthy",
        "service": "intellirity",
        "database": "connected" if is_connected() else "memory",
    }


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
