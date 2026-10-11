from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import OrganizationCreate, OrganizationResponse
from app.models.models import Organization
from app.core.security import require_user

router = APIRouter()

# Authorization model: organizations are owned by the authenticated user
# (Clerk `sub` claim). In open mode (no secret = local dev) the identity is
# "local-dev" and everything created locally is visible locally. A user can
# only list or fetch their OWN orgs — cross-owner access is a 404 (which
# also avoids leaking whether an id exists at all: no IDOR enumeration).

_memory_orgs: list[dict] = []


def _identity(user: dict) -> str:
    return str(user.get("sub") or user.get("user_id") or "local-dev")


@router.post("/", response_model=OrganizationResponse)
async def create_org(
    org: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_user),
):
    owner = _identity(user)
    if len(org.name) > 200 or len(org.slug) > 200:
        raise HTTPException(status_code=422, detail="Name/slug too long (max 200 chars)")
    now = datetime.now(timezone.utc)
    fallback = {
        "id": str(uuid4()),
        "name": org.name,
        "slug": org.slug,
        "plan": "free",
        "is_active": True,
        "created_at": now,
        "owner_id": owner,
    }
    try:
        db_org = Organization(name=org.name, slug=org.slug, owner_id=owner)
        db.add(db_org)
        await db.commit()
        await db.refresh(db_org)
        return OrganizationResponse.model_validate(db_org)
    except Exception:
        _memory_orgs.append(fallback)
        return OrganizationResponse(**fallback)


@router.get("/")
async def list_organizations(user: dict = Depends(require_user)):
    owner = _identity(user)
    mine = [OrganizationResponse(**o) for o in _memory_orgs if o.get("owner_id") == owner]
    return {"organizations": mine}


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, user: dict = Depends(require_user)):
    owner = _identity(user)
    for o in _memory_orgs:
        if o.get("id") == org_id and o.get("owner_id") == owner:
            return OrganizationResponse(**o)
    raise HTTPException(status_code=404, detail=f"Organization {org_id} not found")
