from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.ratelimit import job_create_limit
from app.core.security import require_user
from app.core.identity import owner as _billing_owner
from app.services import jobs as jobstore

router = APIRouter()

JOB_KINDS = ("sweep", "reasoning")


class JobCreate(BaseModel):
    kind: str
    payload: dict = {}
    text: Optional[str] = None
    target: Optional[str] = None
    modules: Optional[list[str]] = None
    prompt: Optional[str] = None
    model: Optional[str] = None


def _normalize_job(kind: str, body: JobCreate) -> dict:
    """Accept flat convenience fields and fold them into the worker payload."""
    payload = dict(body.payload or {})
    if kind == "sweep":
        if body.text is not None:
            payload["text"] = body.text
        if body.target is not None:
            payload["target"] = body.target
        if body.modules is not None:
            payload["modules"] = body.modules
        if "text" not in payload:
            raise HTTPException(status_code=422, detail="sweep jobs need text")
    elif kind == "reasoning":
        if body.prompt is not None:
            payload["prompt"] = body.prompt
        if body.model is not None:
            payload["model"] = body.model
        if not payload.get("prompt"):
            raise HTTPException(status_code=422, detail="reasoning jobs need prompt")
    return payload


@router.post("", status_code=202, dependencies=[Depends(job_create_limit)])
async def create_job(
    body: JobCreate,
    background: BackgroundTasks,
    user: dict = Depends(require_user),
):
    """Queue a slow task; returns immediately with a job id to poll."""
    if body.kind not in JOB_KINDS:
        raise HTTPException(status_code=422, detail=f"unknown kind '{body.kind}' (sweep|reasoning)")
    payload = _normalize_job(body.kind, body)
    # The owner is server-derived: a client-supplied _owner is ignored.
    payload.pop("_owner", None)
    if body.kind == "sweep":
        payload["_owner"] = _billing_owner(user)
    job = jobstore.create_job(body.kind, payload)
    background.add_task(jobstore.execute_job, job["job_id"])
    return job


@router.get("")
async def list_jobs():
    return {"jobs": jobstore.list_jobs()}


@router.get("/{job_id}")
async def get_job(job_id: str):
    job = jobstore.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job
