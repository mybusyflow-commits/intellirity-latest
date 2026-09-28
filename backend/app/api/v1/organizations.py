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
    return {"message": "List organizations"}


@router.get("/{org_id}")
async def get_organization(org_id: str):
    return {"message": f"Get organization {org_id}"}
