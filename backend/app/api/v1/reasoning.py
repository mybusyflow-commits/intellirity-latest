from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.ratelimit import reasoning_limit
from app.services.reasoning import reason_detail

router = APIRouter()


class ReasoningRequest(BaseModel):
    prompt: str
    model: str = "space bunny (free)"


@router.post("", dependencies=[Depends(reasoning_limit)])
async def reasoning(req: ReasoningRequest):
    from fastapi import HTTPException

    # Cost guard: external AI bills per token; cap the prompt.
    if len(req.prompt) > 50_000:
        raise HTTPException(status_code=422, detail="Prompt too long (max 50,000 chars)")
    # available=False means the upstream refused (no credit, free tier is
    # CLI-only, model id gone). The caller gets the reason, not a 200 with
    # a string that merely looks like an answer.
    return await reason_detail(req.prompt, req.model)
