from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import DashboardStats
from app.api.v1.threats import get_threats_store
from app.api.v1.scans import get_scans_store
from app.core.security import require_user

router = APIRouter()


@router.get("/me")
async def get_current_user(user: dict = Depends(require_user)):
    """Identity of the caller, derived from the verified token.

    In open mode (no CLERK_SECRET_KEY) the token is absent, so we say so
    explicitly instead of pretending to be an admin.
    """
    if not user:
        return {
            "id": "local-dev",
            "email": None,
            "full_name": "Local developer",
            "role": "owner",
            "organization": None,
            "auth_mode": "open",
        }

    uid = str(user.get("sub") or user.get("user_id") or "")
    email = user.get("email") or user.get("primary_email_address")
    full_name = (
        user.get("name")
        or user.get("full_name")
        or " ".join(p for p in [user.get("first_name"), user.get("last_name")] if p)
        or email
        or uid
    )
    roles = user.get("roles") or user.get("role") or []
    role = roles[0] if isinstance(roles, list) and roles else (roles if isinstance(roles, str) else "member")

    # Sync the identity into the users table so clerk_id is populated and
    # the org/billing ownership has a durable owner.
    from app.db.persist import upsert_user
    row = await upsert_user({
        "id": uid,
        "email": email,
        "name": full_name,
        "organization_id": user.get("organization_id") or user.get("org_id"),
    })

    return {
        "id": row["id"] if row else uid,
        "clerk_id": uid,
        "email": (row or {}).get("email") or email,
        "full_name": (row or {}).get("full_name") or full_name,
        "role": role,
        "organization": user.get("organization_id") or user.get("org_id"),
        "auth_mode": "verified",
    }


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    threats = get_threats_store()
    scans = get_scans_store()

    active_threats = sum(1 for t in threats if not t.get("is_resolved"))
    resolved_threats = sum(1 for t in threats if t.get("is_resolved"))
    total_scans = len(scans)

    risk_scores = [s.get("risk_score") for s in scans if s.get("risk_score") is not None]
    avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.03

    return DashboardStats(
        total_scans=total_scans,
        active_threats=active_threats,
        resolved_threats=resolved_threats,
        average_risk_score=round(avg_risk, 3),
    )

