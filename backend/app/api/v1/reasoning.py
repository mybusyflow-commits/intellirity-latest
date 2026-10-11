from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.ratelimit import reasoning_limit
from app.services.reasoning import reason

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
    text = await reason(req.prompt, req.model)
    return {"reasoning": text}
