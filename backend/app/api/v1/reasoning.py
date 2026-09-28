from fastapi import APIRouter
from pydantic import BaseModel

from app.services.reasoning import reason

router = APIRouter()


class ReasoningRequest(BaseModel):
    prompt: str
    model: str = "Hy3(free)"


@router.post("")
async def reasoning(req: ReasoningRequest):
    text = await reason(req.prompt, req.model)
    return {"reasoning": text}
