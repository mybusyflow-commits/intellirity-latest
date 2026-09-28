from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import require_user
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import ThreatDetectionResponse

router = APIRouter()

# Stateful in-memory threat store fallback
_INITIAL_THREATS = [
    {
        "id": "EVT-4821",
        "threat_type": "Anomalous Output Distribution",
        "severity": "low",
        "source": "gpt-4-turbo-2024",
        "description": "Output entropy deviation detected beyond normal baseline for gpt-4-turbo endpoint.",
        "is_resolved": False,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "EVT-4820",
        "threat_type": "Prompt Injection Attempt",
        "severity": "medium",
        "source": "claude-3-opus-20240229",
        "description": "Attempted system prompt leak & instruction override detected via roleplay persona.",
        "is_resolved": False,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "EVT-4819",
        "threat_type": "Rate Limit Anomaly",
        "severity": "low",
        "source": "gemini-1.5-pro-latest",
        "description": "High frequency token consumption spike detected from single API client.",
        "is_resolved": True,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "EVT-4818",
        "threat_type": "Data Exfiltration Probe",
        "severity": "high",
        "source": "llama-3-70b-instruct",
        "description": "Markdown image injection attempting exfiltration to external webhook endpoint.",
        "is_resolved": False,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "EVT-4817",
        "threat_type": "Unusual Token Sequence",
        "severity": "low",
        "source": "mistral-7b-instruct-v0.2",
        "description": "Typoglycemia obfuscated token sequence matched known evasion dictionary.",
        "is_resolved": True,
        "created_at": datetime.now(timezone.utc),
    },
    {
        "id": "EVT-4816",
        "threat_type": "Model Drift Detected",
        "severity": "medium",
        "source": "gpt-4-turbo-2024",
        "description": "Perplexity drift detected in model inference output over 100 consecutive requests.",
        "is_resolved": True,
        "created_at": datetime.now(timezone.utc),
    },
]

_memory_threats: list[dict] = list(_INITIAL_THREATS)


def add_threat_event(threat_type: str, severity: str, source: str, description: str) -> dict:
    threat = {
        "id": f"EVT-{len(_memory_threats) + 4822}",
        "threat_type": threat_type,
        "severity": severity,
        "source": source,
        "description": description,
        "is_resolved": False,
        "created_at": datetime.now(timezone.utc),
    }
    _memory_threats.insert(0, threat)
    return threat


def get_threats_store() -> list[dict]:
    return _memory_threats


@router.get("")
@router.get("/", response_model=list[ThreatDetectionResponse])
async def list_threats(
    status: Optional[str] = None,
    severity: Optional[str] = None,
):
    results = _memory_threats
    if status == "active":
        results = [t for t in results if not t["is_resolved"]]
    elif status == "resolved":
        results = [t for t in results if t["is_resolved"]]

    if severity:
        results = [t for t in results if t["severity"].lower() == severity.lower()]

    return [ThreatDetectionResponse(**t) for t in results]


@router.get("/{threat_id}", response_model=ThreatDetectionResponse)
async def get_threat(threat_id: str):
    for t in _memory_threats:
        if t["id"] == threat_id:
            return ThreatDetectionResponse(**t)
    raise HTTPException(status_code=404, detail=f"Threat {threat_id} not found")


@router.post("/{threat_id}/resolve", response_model=ThreatDetectionResponse)
async def resolve_threat(threat_id: str):
    for t in _memory_threats:
        if t["id"] == threat_id:
            t["is_resolved"] = True
            return ThreatDetectionResponse(**t)
    raise HTTPException(status_code=404, detail=f"Threat {threat_id} not found")

