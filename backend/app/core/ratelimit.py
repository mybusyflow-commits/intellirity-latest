"""Per-endpoint tight rate limits for abusable routes.

The global middleware caps /api/ at 60/min/IP. These stricter budgets sit
on top for endpoints that send mail, spend AI budget, or queue CPU work:
contact (spam), reasoning (paid AI tokens), job creation (CPU queue).
Hot scan paths stay on the global limit so legit console use never trips.
"""
import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

_buckets: dict[str, deque] = defaultdict(deque)


def limit(endpoint: str, max_calls: int, window: int = 60):
    async def _dep(request: Request):
        ip = request.client.host if request.client else "unknown"
        key = f"{endpoint}:{ip}"
        now = time.time()
        q = _buckets[key]
        while q and q[0] < now - window:
            q.popleft()
        if len(q) >= max_calls:
            raise HTTPException(
                status_code=429,
                detail=f"Too many {endpoint} requests. Try again in a minute.",
                headers={"Retry-After": "60"},
            )
        q.append(now)

    return _dep


contact_limit = limit("contact", 10)
reasoning_limit = limit("reasoning", 20)
job_create_limit = limit("jobs", 30)
