from fastapi import APIRouter, Depends
from app.core.security import require_user
from app.core.identity import owner as _billing_owner
from app.services.realtime import ingest, get_feed

router = APIRouter()


@router.post("/ingest")
async def ingest_event(payload: dict, user: dict = Depends(require_user)):
    """Ingest a live event (agent action / prompt / data flow) and score it in real time."""
    return ingest(payload, owner=_billing_owner(user))


@router.get("/feed")
async def feed(_: object = Depends(require_user)):
    """Return the rolling live risk feed."""
    return get_feed()
