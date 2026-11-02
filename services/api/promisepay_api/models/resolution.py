"""Domain models for Resolution Cases, Human-Gated Review Decisions & Sandbox Refunds (Phase 5)."""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class ResolutionCaseStatus(str, Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    EVIDENCE_REQUESTED = "EVIDENCE_REQUESTED"
    DECISION_RECORDED = "DECISION_RECORDED"
    RESOLVED_COMPLETE = "RESOLVED_COMPLETE"
    RESOLVED_REFUNDED = "RESOLVED_REFUNDED"
    CLOSED = "CLOSED"


class ResolutionDecision(str, Enum):
    MARK_COMPLETE = "MARK_COMPLETE"
    REQUEST_EVIDENCE = "REQUEST_EVIDENCE"
    OPEN_REVIEW = "OPEN_REVIEW"
    RECOMMEND_REFUND = "RECOMMEND_REFUND"


class CaseTimelineEvent(BaseModel):
    timestamp: str
    actor: str
    action: str
    notes: str


class OpenResolutionCaseRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000, description="Reason for opening resolution review")
    requestedOutcome: Optional[str] = Field("REVIEW", description="Outcome requested by submitter e.g. REVIEW or REFUND")
    submitter: Optional[str] = Field("buyer@example.com", description="Email or identifier of submitter")
    role: Optional[str] = Field("BUYER", description="Role of submitter (BUYER, MERCHANT, REVIEWER)")


class RecordDecisionRequest(BaseModel):
    decision: ResolutionDecision = Field(..., description="Action decision recommended by authorized human reviewer")
    reason: str = Field(..., min_length=5, max_length=1000, description="Mandatory human justification notes")
    reviewer: Optional[str] = Field("reviewer@example.com", description="Reviewer email or identity")


class ExecuteRefundRequest(BaseModel):
    amountValue: Optional[str] = Field(None, description="Optional partial refund amount. Defaults to full captured value.")
    reason: str = Field(..., min_length=5, max_length=255, description="Mandatory reason sent to payer and logged in audit")
    actor: Optional[str] = Field("admin@promisepay.example", description="Authorized business user executing the refund")


class ResolutionCaseResponse(BaseModel):
    caseId: str = Field(..., description="Unique resolution case identifier (case_...)")
    promiseId: str = Field(..., description="Associated Promise ID")
    status: ResolutionCaseStatus = Field(..., description="Current status of the case")
    reason: str = Field(..., description="Initial dispute or review request reason")
    submitter: str = Field(..., description="Identifier of party opening the case")
    submitterRole: str = Field(..., description="Role of submitter")
    decision: Optional[ResolutionDecision] = Field(None, description="Reviewer decision")
    decisionReason: Optional[str] = Field(None, description="Reviewer justification")
    decisionBy: Optional[str] = Field(None, description="Reviewer identity")
    decidedAt: Optional[str] = Field(None, description="Timestamp of decision")
    refundId: Optional[str] = Field(None, description="Internal refund ID if executed")
    paypalRefundId: Optional[str] = Field(None, description="PayPal Sandbox Refund transaction ID")
    refundedAmount: Optional[str] = Field(None, description="Refunded monetary value")
    refundedAt: Optional[str] = Field(None, description="Timestamp of refund execution")
    timeline: List[CaseTimelineEvent] = Field(default_factory=list, description="Case event timeline")
    createdAt: str
    updatedAt: str


class ResolutionCaseListResponse(BaseModel):
    promiseId: str
    items: List[ResolutionCaseResponse]
    total: int


class RefundResultResponse(BaseModel):
    caseId: str
    promiseId: str
    refundId: str
    paypalRefundId: str
    amount: str
    currency: str
    status: str
    idempotencyKey: str
    executedAt: str
