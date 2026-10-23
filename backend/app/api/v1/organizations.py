from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import OrganizationCreate, OrganizationResponse
from app.models.models import Organization
from app.core.security import require_user
from app.core.identity import owner as _identity, org_id as _clerk_org_id, role as _role

router = APIRouter()

# Authorization model: an organization belongs to the tenant that owns the
# request — the Clerk organization when the session has one, otherwise the
# user themselves (a solo tenant). In open mode (no secret = local dev) the
# identity is "local-dev" and everything created locally is visible locally.
# A user can only list or fetch their OWN orgs — cross-owner access is a 404
# (which also avoids leaking whether an id exists at all: no IDOR
# enumeration).

_memory_orgs: list[dict] = []


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
    from app.db.persist import is_connected

    if is_connected():
        try:
            db_org = Organization(name=org.name, slug=org.slug, owner_id=owner)
            db.add(db_org)
            await db.commit()
            await db.refresh(db_org)
            return OrganizationResponse.model_validate(db_org)
        except Exception as exc:
            from sqlalchemy.exc import IntegrityError

            await db.rollback()
            # Duplicate slug is a real conflict, not a reason to fork state.
            if isinstance(exc, IntegrityError) or "unique" in str(exc).lower():
                raise HTTPException(status_code=409, detail=f"Slug '{org.slug}' is taken")
    _memory_orgs.append(fallback)
    return OrganizationResponse(**fallback)


async def _db_orgs(owner: str) -> list[dict]:
    """Best-effort read from Postgres; empty list when unconnected."""
    try:
        from app.db.persist import is_connected
        from app.db.session import async_session
        from sqlalchemy import select

        if not is_connected():
            return []
        async with async_session() as session:
            rows = (await session.execute(
                select(Organization).where(Organization.owner_id == owner)
            )).scalars().all()
            return [{
                "id": r.id, "name": r.name, "slug": r.slug, "plan": r.plan,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else "",
            } for r in rows]
    except Exception:
        return []


@router.get("/")
async def list_organizations(user: dict = Depends(require_user)):
    owner = _identity(user)
    seen: dict[str, dict] = {}
    for o in _memory_orgs:
        if o.get("owner_id") == owner:
            seen[o["id"]] = o
    for o in await _db_orgs(owner):
        seen.setdefault(o["id"], o)
    return {
        "organizations": [OrganizationResponse(**o) for o in seen.values()],
        "owner": owner,
        "clerk_org_id": _clerk_org_id(user),
        "role": _role(user),
    }


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, user: dict = Depends(require_user)):
    owner = _identity(user)
    for o in _memory_orgs:
        if o.get("id") == org_id and o.get("owner_id") == owner:
            return OrganizationResponse(**o)
    for o in await _db_orgs(owner):
        if o.get("id") == org_id:
            return OrganizationResponse(**o)
    raise HTTPException(status_code=404, detail=f"Organization {org_id} not found")
