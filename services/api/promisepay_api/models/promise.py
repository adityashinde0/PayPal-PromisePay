"""Domain models for Promises and requirements."""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class PromiseCategory(str, Enum):
    DIGITAL_PROJECT = "digital_project"
    PROFESSIONAL_DOCUMENT = "professional_document"
    DELIVERY = "delivery"


class PromiseStatus(str, Enum):
    DRAFT = "DRAFT"
    READY_FOR_PAYMENT = "READY_FOR_PAYMENT"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    FULFILLMENT = "FULFILLMENT"
    EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
    VERIFYING = "VERIFYING"
    COMPLETE = "COMPLETE"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    OUTCOME_NOT_VERIFIED = "OUTCOME_NOT_VERIFIED"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"


class Money(BaseModel):
    currencyCode: str = Field(default="USD", description="ISO 4217 3-letter currency code")
    value: str = Field(..., description="Decimal string representation of amount, e.g. '500.00'")

    @field_validator("currencyCode")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        v = v.upper()
        if len(v) != 3 or not v.isalpha():
            raise ValueError("currencyCode must be a 3-letter ISO code")
        return v

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: str) -> str:
        try:
            val = float(v)
            if val <= 0:
                raise ValueError("Amount must be greater than zero")
        except ValueError as err:
            raise ValueError("Amount value must be a valid positive decimal number") from err
        # Ensure standard 2 decimal places format
        return f"{val:.2f}"


class AtomicRequirement(BaseModel):
    id: str = Field(
        default="", description="Unique identifier for requirement, e.g. 'req_responsive_ui'"
    )
    key: str = Field(..., description="Stable requirement key, e.g. 'REQ-1'")
    title: str = Field(..., description="Short summary title")
    description: str = Field(..., description="Detailed description of verifiable outcome")
    priority: int = Field(default=1, ge=1, le=5, description="1=Critical, 2=High, 3=Medium")
    verificationMethod: str = Field(
        ..., description="Expected verification method, e.g. 'URL_SCREENSHOT_ANALYSIS'"
    )


class CreatePromiseRequest(BaseModel):
    category: PromiseCategory
    title: str = Field(..., min_length=3, max_length=150)
    promiseText: str = Field(..., min_length=10, max_length=5000)
    amount: Money
    merchantOrderRef: Optional[str] = Field(None, max_length=64)


class UpdatePromiseRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    promiseText: Optional[str] = Field(None, min_length=10, max_length=5000)
    requirements: Optional[List[AtomicRequirement]] = None


class StructuredPromiseVersion(BaseModel):
    version: int = 1
    sourceText: str
    requirements: List[AtomicRequirement]
    approvedAt: Optional[str] = None
    approvedBy: Optional[str] = None


class PaymentSummary(BaseModel):
    paypalOrderId: Optional[str] = None
    paypalCaptureId: Optional[str] = None
    state: str = "NOT_STARTED"
    amount: Money


class VerificationSummary(BaseModel):
    latestRunId: Optional[str] = None
    status: str = "NONE"
    confidence: Optional[float] = None
    outcome: Optional[str] = None
    completedAt: Optional[str] = None


class ResolutionSummary(BaseModel):
    caseId: Optional[str] = None
    status: str = "NONE"
    decision: Optional[str] = None
    reason: Optional[str] = None


class AuditTimelineEvent(BaseModel):
    timestamp: str
    actor: str
    eventType: str
    summary: str


class PromiseGraphResponse(BaseModel):
    promiseId: str
    organizationId: str
    title: str
    category: PromiseCategory
    status: PromiseStatus
    amount: Money
    currentVersion: int
    requirements: List[AtomicRequirement]
    payment: PaymentSummary
    verification: VerificationSummary
    resolution: ResolutionSummary
    timeline: List[AuditTimelineEvent]
    createdAt: str
    updatedAt: str


class PromiseSummaryResponse(BaseModel):
    promiseId: str
    title: str
    category: PromiseCategory
    status: PromiseStatus
    amount: Money
    paymentState: str
    outcome: Optional[str] = None
    confidence: Optional[float] = None
    createdAt: str


class PromiseListResponse(BaseModel):
    items: List[PromiseSummaryResponse]
    total: int
