from fastapi import APIRouter, Depends
from app.core.security import require_user
from app.services.realtime import ingest, get_feed

router = APIRouter()


@router.post("/ingest")
async def ingest_event(payload: dict, _: object = Depends(require_user)):
    """Ingest a live event (agent action / prompt / data flow) and score it in real time."""
    return ingest(payload)


@router.get("/feed")
async def feed(_: object = Depends(require_user)):
    """Return the rolling live risk feed."""
    return get_feed()
