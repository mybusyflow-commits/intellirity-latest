import os
import sys

# Make the backend package importable from the serverless function.
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app
from mangum import Mangum

# lifespan="off" keeps the function stateless: the local background
# simulator (live monitoring loop) is not started inside ephemeral
# serverless invocations. API routes work normally.
handler = Mangum(app, lifespan="off")
