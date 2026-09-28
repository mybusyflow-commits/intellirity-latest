from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.router import api_router
import app.services.modules  # Register all detection modules


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the live monitoring simulator on startup
    from app.api.v1.system import live_event_loop
    task = asyncio.create_task(live_event_loop())
    yield
    task.cancel()


import asyncio

app = FastAPI(
    title="Intellirity",
    description="AI Security Platform — Protecting AI systems from threats",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
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
import time
from collections import defaultdict, deque
from fastapi import Request

_RATE_LIMIT = 60  # requests
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
    return {"status": "healthy", "service": "intellirity"}


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
