"""SQLAlchemy 2.0 Declarative Models matching 00001_initial_schema.sql (16 Tables)."""

import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON

from promisepay_api.db.database import Base


def now_utc():
    return datetime.now(timezone.utc)


def gen_uuid() -> str:
    return str(uuid.uuid4())


# 1. Users Table
class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    auth_user_id = Column(String(255), unique=True, nullable=True)
    display_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    avatar_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


# 2. Organizations Table
class OrganizationModel(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


# 3. Organization Members Table
class OrganizationMemberModel(Base):
    __tablename__ = "organization_members"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(32), default="BUYER", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)


# 4. Promises Table
class PromiseModel(Base):
    __tablename__ = "promises"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    promise_id = Column(String(64), unique=True, nullable=False, index=True)
    organization_id = Column(String(36), nullable=False, default="00000000-0000-0000-0000-000000000001")
    buyer_id = Column(String(36), nullable=True)
    seller_id = Column(String(36), nullable=True)
    title = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)
    status = Column(String(64), default="DRAFT", nullable=False)
    amount_value = Column(Numeric(15, 2), nullable=False)
    currency_code = Column(String(3), default="USD", nullable=False)
    merchant_order_ref = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    versions = relationship("PromiseVersionModel", back_populates="promise", cascade="all, delete-orphan", lazy="selectin")
    evidence = relationship("EvidenceModel", back_populates="promise", cascade="all, delete-orphan", lazy="selectin")
    payments = relationship("PaymentModel", back_populates="promise", cascade="all, delete-orphan", lazy="selectin")
    resolution_cases = relationship("ResolutionCaseModel", back_populates="promise", cascade="all, delete-orphan", lazy="selectin")


# 5. Promise Versions Table
class PromiseVersionModel(Base):
    __tablename__ = "promise_versions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    promise_id = Column(String(36), ForeignKey("promises.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    source_text = Column(Text, nullable=False)
    structured_promise = Column(JSON, default=dict, nullable=False)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    promise = relationship("PromiseModel", back_populates="versions")
    requirements = relationship("PromiseRequirementModel", back_populates="version_rel", cascade="all, delete-orphan", lazy="selectin")


# 6. Promise Requirements Table
class PromiseRequirementModel(Base):
    __tablename__ = "promise_requirements"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    promise_version_id = Column(String(36), ForeignKey("promise_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(32), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Integer, default=1, nullable=False)
    verification_method = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    version_rel = relationship("PromiseVersionModel", back_populates="requirements")


# 7. Verification Plans Table
class VerificationPlanModel(Base):
    __tablename__ = "verification_plans"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    promise_version_id = Column(String(36), ForeignKey("promise_versions.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(32), default="APPROVED", nullable=False)
    plan_json = Column(JSON, default=dict, nullable=False)
    model_metadata = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)


# 8. Evidence Table
class EvidenceModel(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    promise_id = Column(String(36), ForeignKey("promises.id", ondelete="CASCADE"), nullable=False, index=True)
    uploader_id = Column(String(36), nullable=True)
    evidence_id = Column(String(64), unique=True, nullable=False, index=True)
    kind = Column(String(64), nullable=False)
    source_uri = Column(Text, nullable=True)
    storage_key = Column(String(255), nullable=True)
    sha256 = Column(String(64), nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    submitter_claim = Column(Text, nullable=True)
    status = Column(String(32), default="SUBMITTED", nullable=False)
    provenance_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    promise = relationship("PromiseModel", back_populates="evidence")


# 9. Evidence Requirements Join Table
class EvidenceRequirementModel(Base):
    __tablename__ = "evidence_requirements"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(36), ForeignKey("promise_requirements.id", ondelete="CASCADE"), nullable=False)
    declared_by_submitter = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)


# 10. Payments Table
class PaymentModel(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    promise_id = Column(String(36), ForeignKey("promises.id", ondelete="CASCADE"), nullable=False, index=True)
    paypal_order_id = Column(String(64), unique=True, nullable=False, index=True)
    paypal_capture_id = Column(String(64), unique=True, nullable=True)
    state = Column(String(32), default="ORDER_CREATED", nullable=False)
    amount_value = Column(Numeric(15, 2), nullable=False)
    currency_code = Column(String(3), default="USD", nullable=False)
    idempotency_key = Column(String(128), nullable=True)
    raw_response = Column(JSON, default=dict, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    promise = relationship("PromiseModel", back_populates="payments")


# 11. PayPal Events Table (Webhook receipts)
class PayPalEventModel(Base):
    __tablename__ = "paypal_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    paypal_event_id = Column(String(64), unique=True, nullable=False, index=True)
    payment_id = Column(String(36), nullable=True)
    event_type = Column(String(128), nullable=False)
    payload_digest = Column(String(64), nullable=False)
    signature_status = Column(String(32), default="VERIFIED", nullable=False)
    raw_payload = Column(JSON, default=dict, nullable=False)
    processed_at = Column(DateTime(timezone=True), default=now_utc)


# 12. Verification Runs Table
class VerificationRunModel(Base):
    __tablename__ = "verification_runs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    run_id = Column(String(64), unique=True, nullable=False, index=True)
    promise_id = Column(String(64), nullable=False, index=True)
    state = Column(String(32), default="QUEUED", nullable=False)
    outcome = Column(String(32), default="PENDING", nullable=False)
    overall_confidence = Column(Float, default=0.0, nullable=False)
    evidence_manifest_hash = Column(String(64), default="", nullable=False)
    results = Column(JSON, default=list, nullable=False)
    model_metadata = Column(JSON, default=dict, nullable=False)
    started_at = Column(DateTime(timezone=True), default=now_utc)
    completed_at = Column(DateTime(timezone=True), nullable=True)


# 13. Verification Results Table
class VerificationResultModel(Base):
    __tablename__ = "verification_results"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    run_id = Column(String(36), ForeignKey("verification_runs.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(64), nullable=False)
    status = Column(String(32), default="PENDING", nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    reasoning = Column(Text, nullable=False)
    missing_information = Column(JSON, default=list, nullable=False)
    evidence_refs = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)


# 14. Resolution Cases Table
class ResolutionCaseModel(Base):
    __tablename__ = "resolution_cases"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    case_id = Column(String(64), unique=True, nullable=False, index=True)
    promise_id = Column(String(36), ForeignKey("promises.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), default="OPEN", nullable=False)
    opened_by = Column(String(255), nullable=True)
    role = Column(String(32), default="BUYER", nullable=False)
    reason = Column(Text, nullable=False)
    requested_outcome = Column(String(64), default="REVIEW", nullable=False)
    decision = Column(JSON, nullable=True)
    refund_id = Column(String(64), nullable=True)
    paypal_refund_id = Column(String(64), nullable=True)
    refund_amount = Column(Numeric(15, 2), nullable=True)
    refunded_at = Column(DateTime(timezone=True), nullable=True)
    timeline = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    promise = relationship("PromiseModel", back_populates="resolution_cases")


# 15. Resolution Decisions Table
class ResolutionDecisionModel(Base):
    __tablename__ = "resolution_decisions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    case_id = Column(String(36), ForeignKey("resolution_cases.id", ondelete="CASCADE"), nullable=False)
    decision = Column(String(64), nullable=False)
    reason = Column(Text, nullable=False)
    refund_amount = Column(Numeric(15, 2), nullable=True)
    paypal_refund_id = Column(String(64), nullable=True)
    decided_by = Column(String(255), nullable=True)
    authorized_at = Column(DateTime(timezone=True), default=now_utc)


# 16. Audit Logs Table
class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    organization_id = Column(String(36), nullable=False, default="00000000-0000-0000-0000-000000000001")
    promise_id = Column(String(64), nullable=True, index=True)
    actor_type = Column(String(64), nullable=False)
    actor_id = Column(String(255), nullable=False)
    event_type = Column(String(64), nullable=False)
    summary = Column(Text, nullable=True)
    before_hash = Column(String(64), nullable=True)
    after_hash = Column(String(64), nullable=True)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

