"""In-process background jobs (free; no Redis needed on a single instance).

Slow tasks (multi-module sweeps, external AI reasoning) run AFTER the
request returns, so the user never waits. Each job has an id, a status,
one automatic retry, and a logged error trail. Results are kept for an
hour. If the process dies the registry dies with it — acceptable on a
single instance; migrate to Redis/BullMQ only when horizontally scaled.

Queue recommendation: this file. Cost: $0.
"""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any

log = logging.getLogger("intellirity.jobs")

_jobs: dict[str, dict[str, Any]] = {}
_MAX_JOBS = 200
_RESULT_TTL = 3600
_MAX_RETRIES = 1


def create_job(kind: str, payload: dict) -> dict:
    job_id = f"JOB-{uuid.uuid4().hex[:12].upper()}"
    now = time.time()
    job = {
        "job_id": job_id,
        "kind": kind,
        "status": "queued",
        "payload": payload,
        "result": None,
        "error": None,
        "attempts": 0,
        "created_at": now,
        "updated_at": now,
    }
    _jobs[job_id] = job
    if len(_jobs) > _MAX_JOBS:
        oldest = min(_jobs, key=lambda k: _jobs[k]["created_at"])
        del _jobs[oldest]
    return _public(job)


def get_job(job_id: str) -> dict | None:
    job = _jobs.get(job_id)
    if not job:
        return None
    if job["status"] in ("done", "failed") and time.time() - job["updated_at"] > _RESULT_TTL:
        del _jobs[job_id]
        return None
    return _public(job)


def list_jobs() -> list[dict]:
    return [_public(j) for j in sorted(_jobs.values(), key=lambda j: j["created_at"], reverse=True)[:50]]


def _public(job: dict) -> dict:
    return {k: v for k, v in job.items() if k != "payload"}


def _run_sweep(payload: dict) -> dict:
    # Imported lazily to avoid circulars at module load.
    from app.api.v1.scans import run_full_scan_sync

    return run_full_scan_sync(payload)


async def _run_reasoning(payload: dict) -> dict:
    from app.services.reasoning import reason

    text = await reason(str(payload.get("prompt", "")), str(payload.get("model", "space bunny (free)")))
    return {"reasoning": text}


def execute_job(job_id: str) -> None:
    """Worker body: runs inside BackgroundTasks. Retries once, logs errors."""
    job = _jobs.get(job_id)
    if not job:
        return
    import asyncio

    job["status"] = "running"
    job["updated_at"] = time.time()
    while job["attempts"] <= _MAX_RETRIES:
        job["attempts"] += 1
        try:
            if job["kind"] == "sweep":
                job["result"] = _run_sweep(job["payload"])
            elif job["kind"] == "reasoning":
                job["result"] = asyncio.run(_run_reasoning(job["payload"]))
            else:
                raise ValueError(f"unknown job kind: {job['kind']}")
            job["status"] = "done"
            job["error"] = None
            job["updated_at"] = time.time()
            return
        except Exception as exc:
            job["error"] = f"attempt {job['attempts']}: {exc}"
            log.warning("job %s failed: %s", job_id, exc)
    job["status"] = "failed"
    job["updated_at"] = time.time()
    log.error("job %s failed after %d attempts: %s", job_id, job["attempts"], job["error"])
