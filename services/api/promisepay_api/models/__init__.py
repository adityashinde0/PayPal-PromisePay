"""Domain and request/response models."""

from enum import Enum

from promisepay_api.models.evidence import (
    EvidenceKind,
    EvidenceListResponse,
    EvidenceProvenance,
    EvidenceResponse,
    EvidenceStatus,
    EvidenceUploadIntentRequest,
    EvidenceUploadIntentResponse,
    RegisterEvidenceRequest,
)
from promisepay_api.models.resolution import (
    CaseTimelineEvent,
    ExecuteRefundRequest,
    OpenResolutionCaseRequest,
    RecordDecisionRequest,
    RefundResultResponse,
    ResolutionCaseListResponse,
    ResolutionCaseResponse,
    ResolutionCaseStatus,
    ResolutionDecision,
)
from promisepay_api.models.verification import (
    CreateVerificationRequest,
    RequirementFinding,
    VerificationListResponse,
    VerificationOutcome,
    VerificationRunResponse,
    VerificationRunState,
    VerificationStatus,
)

__all__ = [
    "PromiseCategory",
    "PromiseStatus",
    "PaymentState",
    "EvidenceKind",
    "EvidenceStatus",
    "EvidenceProvenance",
    "EvidenceUploadIntentRequest",
    "EvidenceUploadIntentResponse",
    "RegisterEvidenceRequest",
    "EvidenceResponse",
    "EvidenceListResponse",
    "VerificationStatus",
    "VerificationOutcome",
    "VerificationRunState",
    "RequirementFinding",
    "CreateVerificationRequest",
    "VerificationRunResponse",
    "VerificationListResponse",
    "ResolutionCaseStatus",
    "ResolutionDecision",
    "CaseTimelineEvent",
    "OpenResolutionCaseRequest",
    "RecordDecisionRequest",
    "ExecuteRefundRequest",
    "ResolutionCaseResponse",
    "ResolutionCaseListResponse",
    "RefundResultResponse",
]


class PromiseCategory(str, Enum):
    DIGITAL_PROJECT = "DIGITAL_PROJECT"
    PROFESSIONAL_DOCUMENT = "PROFESSIONAL_DOCUMENT"
    DELIVERY = "DELIVERY"


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


class PaymentState(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    ORDER_CREATED = "ORDER_CREATED"
    APPROVED = "APPROVED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"
