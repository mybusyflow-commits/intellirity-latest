from fastapi import APIRouter
from app.api.v1 import scans, threats, users, organizations, modules, system, reasoning, realtime

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(scans.router, prefix="/scans", tags=["scans"])
api_router.include_router(threats.router, prefix="/threats", tags=["threats"])
api_router.include_router(modules.router, prefix="/modules", tags=["modules"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(reasoning.router, prefix="/reasoning", tags=["reasoning"])
api_router.include_router(realtime.router, prefix="/realtime", tags=["realtime"])

