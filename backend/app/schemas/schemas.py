from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    organization_id: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationCreate(BaseModel):
    name: str
    slug: str


class InMemoryOrganization(BaseModel):
    name: str
    slug: str


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SecurityScanCreate(BaseModel):
    scan_type: str
    target: str


class SecurityScanResponse(BaseModel):
    id: str
    scan_type: str
    target: str
    status: str
    risk_score: Optional[float]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ThreatDetectionResponse(BaseModel):
    id: str
    threat_type: str
    severity: str
    source: str
    description: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_scans: int
    active_threats: int
    resolved_threats: int
    average_risk_score: float
