"""Evidence domain models and schemas for Phase 3."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EvidenceKind(str, Enum):
    LIVE_URL = "live_url"
    REPOSITORY = "repository"
    SCREENSHOT = "screenshot"
    DOCUMENT = "document"
    TRACKING_REFERENCE = "tracking_reference"
    DELIVERY_CONFIRMATION = "delivery_confirmation"
    METADATA = "metadata"

    @classmethod
    def from_str(cls, val: str) -> "EvidenceKind":
        mapping = {
            "live_url": cls.LIVE_URL,
            "url_snapshot": cls.LIVE_URL,
            "repository": cls.REPOSITORY,
            "git_repository": cls.REPOSITORY,
            "screenshot": cls.SCREENSHOT,
            "image_screenshot": cls.SCREENSHOT,
            "document": cls.DOCUMENT,
            "document_file": cls.DOCUMENT,
            "tracking_reference": cls.TRACKING_REFERENCE,
            "delivery_confirmation": cls.DELIVERY_CONFIRMATION,
            "metadata": cls.METADATA,
        }
        normalized = val.lower().strip()
        if normalized in mapping:
            return mapping[normalized]
        raise ValueError(f"Unsupported evidence kind: '{val}'")


class EvidenceStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    PENDING_SCAN = "PENDING_SCAN"
    SCAN_CLEAN = "SCAN_CLEAN"
    SUSPICIOUS = "SUSPICIOUS"
    REJECTED = "REJECTED"


class EvidenceProvenance(BaseModel):
    receivedAt: str
    submittedBy: str = "bob.merchant@example.com"
    uploaderRole: str = "SELLER"
    sourceHost: Optional[str] = None
    canonicalUri: Optional[str] = None
    sha256: str = Field(..., description="SHA-256 hash digest")
    mimeType: Optional[str] = None
    sizeBytes: Optional[int] = None
    scannerStatus: str = "SCAN_CLEAN"
    scannerVersion: str = "promisepay-guard-v1"
    isClaimOnly: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvidenceUploadIntentRequest(BaseModel):
    fileName: str = Field(..., min_length=1, max_length=255)
    mimeType: str = Field(..., min_length=3, max_length=100)
    sizeBytes: int = Field(..., gt=0, le=26214400, description="Max 25MB")
    requirementIds: List[str] = Field(..., min_length=1)


class EvidenceUploadIntentResponse(BaseModel):
    evidenceId: str
    storageKey: str
    uploadUrl: str
    expiresAt: str
    maxSizeBytes: int


class RegisterEvidenceRequest(BaseModel):
    kind: str
    title: Optional[str] = None
    source: Optional[str] = None
    requirementIds: List[str] = Field(..., min_length=1)
    submitterClaim: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Explicit seller statement of what this item claims to prove",
    )
    evidenceId: Optional[str] = None
    storageKey: Optional[str] = None
    sha256: Optional[str] = None
    mimeType: Optional[str] = None
    sizeBytes: Optional[int] = None


class EvidenceResponse(BaseModel):
    evidenceId: str
    promiseId: str
    kind: EvidenceKind
    title: str
    sourceUri: Optional[str] = None
    canonicalUri: Optional[str] = None
    storageKey: Optional[str] = None
    sha256: str
    requirementIds: List[str]
    submitterClaim: str
    uploader: str
    status: EvidenceStatus
    provenance: EvidenceProvenance
    downloadUrl: Optional[str] = None
    createdAt: str


class EvidenceListResponse(BaseModel):
    promiseId: str
    items: List[EvidenceResponse]
    total: int
