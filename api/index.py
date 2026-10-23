import os
import sys

# Make the backend package importable from the serverless function.
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from mangum import Mangum

# lifespan="off" keeps the function stateless: the background demo-feed
# task is not started inside ephemeral serverless invocations, and the
# database bootstrap happens lazily on the first request instead.
#
# Path handling: the console calls the engine at /backend/<path>, which
# vercel.json rewrites to /api/v1/<path> before the function is invoked.
# Mangum forwards the request path to the ASGI app unchanged, and the app
# mounts its API router at /api/v1, so /api/v1/... lands exactly where it
# should. Calls to /api/v1/... (the legacy site's shape) work unchanged.
handler = Mangum(app, lifespan="off")
