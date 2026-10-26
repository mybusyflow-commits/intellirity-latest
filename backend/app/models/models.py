from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Text, BigInteger, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func
import uuid


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    organization_id: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    owner_id: Mapped[str] = mapped_column(String, nullable=False)
    plan: Mapped[str] = mapped_column(String, default="free")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SecurityScan(Base):
    __tablename__ = "security_scans"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    organization_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    scan_type: Mapped[str] = mapped_column(String, nullable=False)
    target: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")
    findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_score: Mapped[float | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LedgerRecord(Base):
    __tablename__ = "ledger_records"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    # Monotonic position in the chain. Wall-clock timestamps can collide
    # (or arrive out of order) when two processes append at once, which
    # would order the rows differently from the sequence they were sealed
    # in. The sequence is the authority for chain order.
    seq: Mapped[int] = mapped_column(BigInteger, server_default=func.nextval("ledger_records_seq_seq"),
                                     nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ai_decision: Mapped[str] = mapped_column(Text, default="")
    prompt_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    action_taken: Mapped[str] = mapped_column(Text, default="")
    confidence_score: Mapped[float | None] = mapped_column(nullable=True)
    previous_hash: Mapped[str] = mapped_column(String, default="")
    merkle_hash: Mapped[str] = mapped_column(String, index=True, default="")
    record_json: Mapped[str] = mapped_column(Text, default="{}")


class EscrowHold(Base):
    __tablename__ = "escrow_holds"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String, index=True, default="")
    amount: Mapped[float] = mapped_column(default=0.0)
    status: Mapped[str] = mapped_column(String, default="held")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Order(Base):
    """A purchase, stored so a payment callback can find it.

    Serverless deployments run many instances; the checkout and the payment
    provider's return POST can land on different ones. Memory alone would
    silently lose paid orders, so every order is written before the buyer is
    sent to the gateway and read back when the gateway returns.
    """
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # ORD-XXXXXXXXXX
    owner: Mapped[str] = mapped_column(String, index=True, nullable=False)
    modules: Mapped[str] = mapped_column(Text, default="[]")  # JSON list
    subtotal_inr: Mapped[int] = mapped_column(Integer, default=0)
    discount_pct: Mapped[int] = mapped_column(Integer, default=0)
    discount_inr: Mapped[int] = mapped_column(Integer, default=0)
    total_inr: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="pending-payment", index=True)
    provider: Mapped[str] = mapped_column(String, default="payu")
    provider_txnid: Mapped[str] = mapped_column(String, default="", index=True)
    paid_via: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Entitlement(Base):
    """One purchased module for one tenant. Survives restarts."""
    __tablename__ = "entitlements"

    owner: Mapped[str] = mapped_column(String, primary_key=True)
    product_id: Mapped[str] = mapped_column(String, primary_key=True)
    order_id: Mapped[str] = mapped_column(String, default="")
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContactSubmission(Base):
    """A public contact-form submission.

    Written before the notification email is attempted: mail delivery is
    best effort, losing the lead is not. The console and the operator can
    always read the table even if the mail provider is down.
    """
    __tablename__ = "contact_submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String, default="")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String, default="landing")
    client_ip: Mapped[str] = mapped_column(String, default="")
    user_agent: Mapped[str] = mapped_column(String, default="")
    notified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ThreatDetection(Base):
    __tablename__ = "threat_detections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    threat_type: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
