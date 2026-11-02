"""Domain models for AI Verification Engine & Explainable Outcomes (Phase 4)."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED"
    NOT_VERIFIED = "NOT_VERIFIED"
    HUMAN_REVIEW_REQUIRED = "HUMAN_REVIEW_REQUIRED"


class VerificationOutcome(str, Enum):
    COMPLETE = "COMPLETE"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    OUTCOME_NOT_VERIFIED = "OUTCOME_NOT_VERIFIED"


class VerificationRunState(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RequirementFinding(BaseModel):
    requirementId: str = Field(..., description="ID or key of the requirement being verified")
    requirementKey: Optional[str] = Field(
        None, description="Human-readable requirement key e.g. REQ-1"
    )
    status: VerificationStatus = Field(..., description="Verification classification")
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Confidence score clamped by deterministic rules"
    )
    evidenceIds: List[str] = Field(
        default_factory=list, description="Validated evidence IDs cited as proof"
    )
    reasoning: str = Field(
        ..., description="Plain-language explanation grounded strictly in submitted evidence"
    )
    missingInformation: List[str] = Field(
        default_factory=list, description="Gaps preventing full verification"
    )
    limitations: List[str] = Field(
        default_factory=list, description="What this evidence cannot establish"
    )
    deterministicChecks: Dict[str, Any] = Field(
        default_factory=dict, description="Pre-check outputs (reachability, hashes, MIME validity)"
    )


class CreateVerificationRequest(BaseModel):
    evidenceIds: Optional[List[str]] = Field(
        None,
        description="Optional subset of evidence IDs to evaluate. Defaults to all active evidence.",
    )
    forceRerun: bool = Field(
        False, description="Whether to trigger a new run even if an existing completed run exists."
    )


class VerificationRunResponse(BaseModel):
    runId: str = Field(..., description="Unique verification run ID (vr_...)")
    promiseId: str = Field(..., description="Associated Promise ID")
    promiseVersion: int = Field(..., description="Frozen promise version evaluated")
    state: VerificationRunState = Field(..., description="Current status of the run")
    outcome: Optional[VerificationOutcome] = Field(
        None, description="Deterministic overall outcome"
    )
    overallConfidence: Optional[float] = Field(
        None, description="Average confidence score across requirements"
    )
    results: List[RequirementFinding] = Field(
        default_factory=list, description="Per-requirement findings"
    )
    evidenceManifestHash: str = Field(
        ..., description="SHA-256 digest of frozen evidence items evaluated"
    )
    modelIdentifier: str = Field(
        "promisepay-verifier-v1", description="Model used for semantic analysis"
    )
    promptVersion: str = Field("pv_2026_01", description="Version of the prompt template used")
    startedAt: str = Field(..., description="ISO 8601 timestamp when run started")
    completedAt: Optional[str] = Field(None, description="ISO 8601 timestamp when run completed")
    errorMessage: Optional[str] = Field(None, description="Error details if state is FAILED")


class VerificationListResponse(BaseModel):
    promiseId: str
    runs: List[VerificationRunResponse]
    total: int
