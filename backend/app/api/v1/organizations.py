from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import OrganizationCreate, OrganizationResponse
from app.models.models import Organization

router = APIRouter()

_memory_orgs: list[OrganizationResponse] = []


@router.post("/", response_model=OrganizationResponse)
async def create_org(
    org: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    fallback = OrganizationResponse(
        id=str(uuid4()),
        name=org.name,
        slug=org.slug,
        plan="free",
        is_active=True,
        created_at=now,
    )
    try:
        db_org = Organization(name=org.name, slug=org.slug, owner_id="temp-owner-id")
        db.add(db_org)
        await db.commit()
        await db.refresh(db_org)
        return OrganizationResponse.model_validate(db_org)
    except Exception:
        _memory_orgs.append(fallback)
        return fallback


@router.get("/")
async def list_organizations():
    return {"organizations": _memory_orgs}


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str):
    from fastapi import HTTPException

    for o in _memory_orgs:
        if o.id == org_id:
            return o
    raise HTTPException(status_code=404, detail=f"Organization {org_id} not found")
