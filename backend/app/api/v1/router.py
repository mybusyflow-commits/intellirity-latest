from fastapi import APIRouter, Depends
from app.api.v1 import scans, threats, users, organizations, modules, system, reasoning, realtime, jobs
from app.core.security import require_user

# Deploy posture: every router requires a valid session EXCEPT system
# (contact must stay public for pre-signup reachout; status stays public
# for uptime monitors). With no CLERK_SECRET_KEY configured the dependency
# is a no-op, so local dev is unaffected.
AUTH = [Depends(require_user)]

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"], dependencies=AUTH)
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"], dependencies=AUTH)
api_router.include_router(scans.router, prefix="/scans", tags=["scans"], dependencies=AUTH)
api_router.include_router(threats.router, prefix="/threats", tags=["threats"], dependencies=AUTH)
api_router.include_router(modules.router, prefix="/modules", tags=["modules"], dependencies=AUTH)
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(reasoning.router, prefix="/reasoning", tags=["reasoning"], dependencies=AUTH)
api_router.include_router(realtime.router, prefix="/realtime", tags=["realtime"], dependencies=AUTH)
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"], dependencies=AUTH)
