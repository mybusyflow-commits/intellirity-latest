"""Vercel entrypoint for the Intellirity engine.

Vercel serves a file in `api/` at its own path: `api/index.py` answers
`/api`, and nothing answers `/api/v1/...`. A rewrite cannot invent a route
that does not exist, so `vercel.json` moves the path into a query instead:

    /backend/system/status  ->  /api?__path=system/status

`PathRewriteMiddleware` in `app/main.py` turns `__path` back into the real
request path (`/api/v1/system/status`) before routing and removes the
parameter, so the application sees exactly what it sees locally.

Two import styles are provided on purpose:

* `app` — Vercel detects this ASGI application and serves it natively.
* `handler` — the Mangum adapter, used when the function is invoked in an
  AWS-style event shape (local `vercel dev` in some versions, or a Lambda
  sidecar). Mangum builds the ASGI scope from the event, and the same
  middleware then applies.

`lifespan="off"` keeps the function stateless: the background demo-feed
task never starts inside an ephemeral invocation, and the database
bootstrap happens lazily on the first request.
"""
import os
import sys

# Make the backend package importable from the serverless function.
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app  # noqa: E402  (path setup must run first)
from mangum import Mangum  # noqa: E402

handler = Mangum(app, lifespan="off")

__all__ = ["app", "handler"]
