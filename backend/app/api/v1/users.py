from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import DashboardStats
from app.api.v1.threats import get_threats_store
from app.api.v1.scans import get_scans_store

router = APIRouter()


@router.get("/me")
async def get_current_user():
    return {
        "id": "usr-admin-01",
        "email": "security@intellirity.com",
        "full_name": "Intellirity Admin",
        "role": "Security Officer",
        "organization": "Enterprise Defense Corp",
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

