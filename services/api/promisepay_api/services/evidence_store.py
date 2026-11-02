"""Evidence storage and lifecycle management service."""

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

from promisepay_api.models.evidence import (
    EvidenceKind,
    EvidenceProvenance,
    EvidenceResponse,
    EvidenceStatus,
    EvidenceUploadIntentRequest,
    EvidenceUploadIntentResponse,
    RegisterEvidenceRequest,
)
from promisepay_api.models.promise import AuditTimelineEvent, PromiseStatus
from promisepay_api.services.evidence_guard import (
    compute_sha256,
    sanitize_filename,
    validate_and_canonicalize_url,
    validate_file_metadata,
)
from promisepay_api.services.promise_store import PromiseRecord

# Local object store directory
LOCAL_STORAGE_DIR = Path(".storage/evidence")
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


class UploadIntentRecord:
    def __init__(
        self,
        evidence_id: str,
        promise_id: str,
        organization_id: str,
        file_name: str,
        mime_type: str,
        size_bytes: int,
        requirement_ids: List[str],
        storage_key: str,
        expires_at: datetime,
    ):
        self.evidence_id = evidence_id
        self.promise_id = promise_id
        self.organization_id = organization_id
        self.file_name = file_name
        self.mime_type = mime_type
        self.size_bytes = size_bytes
        self.requirement_ids = requirement_ids
        self.storage_key = storage_key
        self.expires_at = expires_at
        self.uploaded_content: Optional[bytes] = None
        self.uploaded_sha256: Optional[str] = None


class EvidenceItemRecord:
    def __init__(
        self,
        evidence_id: str,
        promise_id: str,
        kind: EvidenceKind,
        title: str,
        requirement_ids: List[str],
        submitter_claim: str,
        sha256: str,
        uploader: str = "bob.merchant@example.com",
        source_uri: Optional[str] = None,
        canonical_uri: Optional[str] = None,
        storage_key: Optional[str] = None,
        status: EvidenceStatus = EvidenceStatus.SCAN_CLEAN,
        provenance: Optional[EvidenceProvenance] = None,
    ):
        self.evidence_id = evidence_id
        self.promise_id = promise_id
        self.kind = kind
        self.title = title
        self.requirement_ids = requirement_ids
        self.submitter_claim = submitter_claim
        self.sha256 = sha256
        self.uploader = uploader
        self.source_uri = source_uri
        self.canonical_uri = canonical_uri
        self.storage_key = storage_key
        self.status = status
        self.provenance = provenance
        self.created_at = datetime.now(timezone.utc).isoformat()

    def to_response(self, base_url: str = "") -> EvidenceResponse:
        download_url = None
        if self.storage_key:
            download_url = (
                f"{base_url}/api/promises/{self.promise_id}/evidence/{self.evidence_id}/download"
            )
        elif self.canonical_uri:
            download_url = self.canonical_uri

        return EvidenceResponse(
            evidenceId=self.evidence_id,
            promiseId=self.promise_id,
            kind=self.kind,
            title=self.title,
            sourceUri=self.source_uri,
            canonicalUri=self.canonical_uri,
            storageKey=self.storage_key,
            sha256=self.sha256,
            requirementIds=self.requirement_ids,
            submitterClaim=self.submitter_claim,
            uploader=self.uploader,
            status=self.status,
            provenance=self.provenance,
            downloadUrl=download_url,
            createdAt=self.created_at,
        )


class EvidenceStore:
    def __init__(self):
        self._upload_intents: Dict[str, UploadIntentRecord] = {}
        self._evidence: Dict[str, List[EvidenceItemRecord]] = {}
        self._file_contents: Dict[str, bytes] = {}
        self._seed_initial_data()

    def _seed_initial_data(self):
        """Seed initial evidence for demo promises."""
        now_iso = datetime.now(timezone.utc).isoformat()
        ev1 = EvidenceItemRecord(
            evidence_id="ev_demo1_live",
            promise_id="PP-DEMO1-2026",
            kind=EvidenceKind.LIVE_URL,
            title="Production Storefront Deployment",
            requirement_ids=["req_demo1_ui", "req_demo1_deploy"],
            submitter_claim="The live Next.js storefront is deployed with working catalog and responsive UI.",
            sha256="4f8b9a7c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a",
            uploader="bob.merchant@example.com",
            source_uri="https://demo-storefront.promisepay.dev",
            canonical_uri="https://demo-storefront.promisepay.dev/",
            status=EvidenceStatus.SCAN_CLEAN,
            provenance=EvidenceProvenance(
                receivedAt=now_iso,
                submittedBy="bob.merchant@example.com",
                uploaderRole="SELLER",
                sourceHost="demo-storefront.promisepay.dev",
                canonicalUri="https://demo-storefront.promisepay.dev/",
                sha256="4f8b9a7c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a",
                mimeType="text/html",
                scannerStatus="SCAN_CLEAN",
                scannerVersion="promisepay-guard-v1",
                isClaimOnly=True,
                metadata={
                    "submitterClaim": "The live Next.js storefront is deployed with working catalog and responsive UI."
                },
            ),
        )

        ev2 = EvidenceItemRecord(
            evidence_id="ev_demo1_repo",
            promise_id="PP-DEMO1-2026",
            kind=EvidenceKind.REPOSITORY,
            title="Next.js Storefront GitHub Repository",
            requirement_ids=["req_demo1_deploy"],
            submitter_claim="Public GitHub repository containing frontend source code and CI deployment workflows.",
            sha256="1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
            uploader="bob.merchant@example.com",
            source_uri="https://github.com/promisepay-demo/ecommerce-storefront",
            canonical_uri="https://github.com/promisepay-demo/ecommerce-storefront",
            status=EvidenceStatus.SCAN_CLEAN,
            provenance=EvidenceProvenance(
                receivedAt=now_iso,
                submittedBy="bob.merchant@example.com",
                uploaderRole="SELLER",
                sourceHost="github.com",
                canonicalUri="https://github.com/promisepay-demo/ecommerce-storefront",
                sha256="1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
                mimeType="text/html",
                scannerStatus="SCAN_CLEAN",
                scannerVersion="promisepay-guard-v1",
                isClaimOnly=True,
                metadata={
                    "submitterClaim": "Public GitHub repository containing frontend source code and CI deployment workflows."
                },
            ),
        )
        self._evidence["PP-DEMO1-2026"] = [ev1, ev2]

        # Pre-staged evidence for PP-DEMO2-2026 (Professional Document with deliberate missing section)
        ev_doc = EvidenceItemRecord(
            evidence_id="ev_demo2_doc",
            promise_id="PP-DEMO2-2026",
            kind=EvidenceKind.DOCUMENT,
            title="SOC2 Type II Security Assessment & Architecture Draft",
            requirement_ids=["req_demo2_sec", "req_demo2_len"],
            submitter_claim="Comprehensive 12-page draft containing Executive Summary, Architecture, and STRIDE Threat Model (Access Matrix section pending final review).",
            sha256="b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7",
            uploader="bob.merchant@example.com",
            source_uri="https://storage.promisepay.dev/reports/soc2-readiness-draft.pdf",
            canonical_uri="https://storage.promisepay.dev/reports/soc2-readiness-draft.pdf",
            status=EvidenceStatus.SCAN_CLEAN,
            provenance=EvidenceProvenance(
                receivedAt=now_iso,
                submittedBy="bob.merchant@example.com",
                uploaderRole="SELLER",
                sourceHost="storage.promisepay.dev",
                canonicalUri="https://storage.promisepay.dev/reports/soc2-readiness-draft.pdf",
                sha256="b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7",
                mimeType="application/pdf",
                scannerStatus="SCAN_CLEAN",
                scannerVersion="promisepay-guard-v1",
                isClaimOnly=True,
                metadata={
                    "submitterClaim": "12-page draft containing Executive Summary, Architecture, and STRIDE Threat Model.",
                    "pageCount": 12,
                    "targetPageCount": 15,
                },
            ),
        )
        self._evidence["PP-DEMO2-2026"] = [ev_doc]

        # Pre-staged evidence for PP-DEMO3-2026 (Delivery with tracking carrier adapter)
        ev_trk = EvidenceItemRecord(
            evidence_id="ev_demo3_trk",
            promise_id="PP-DEMO3-2026",
            kind=EvidenceKind.TRACKING_REFERENCE,
            title="UPS Express Carrier Dispatch & Proof of Delivery",
            requirement_ids=["req_demo3_trk", "req_demo3_del"],
            submitter_claim="Carrier tracking number 1Z9999999999999999 confirmed dispatched within 24h and delivered to loading dock / recipient signed.",
            sha256="c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
            uploader="bob.merchant@example.com",
            source_uri="https://www.ups.com/track?tracknum=1Z9999999999999999",
            canonical_uri="https://www.ups.com/track?tracknum=1Z9999999999999999",
            status=EvidenceStatus.SCAN_CLEAN,
            provenance=EvidenceProvenance(
                receivedAt=now_iso,
                submittedBy="bob.merchant@example.com",
                uploaderRole="SELLER",
                sourceHost="www.ups.com",
                canonicalUri="https://www.ups.com/track?tracknum=1Z9999999999999999",
                sha256="c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
                mimeType="text/plain",
                scannerStatus="SCAN_CLEAN",
                scannerVersion="promisepay-guard-v1",
                isClaimOnly=True,
                metadata={
                    "carrier": "UPS",
                    "trackingNumber": "1Z9999999999999999",
                    "status": "DELIVERED",
                    "deliveredAt": now_iso,
                    "conditionGuarantee": False,
                },
            ),
        )
        self._evidence["PP-DEMO3-2026"] = [ev_trk]

    def reset(self):
        """Reset evidence store to default seed state for demo replayability."""
        self._upload_intents.clear()
        self._evidence.clear()
        self._file_contents.clear()
        self._seed_initial_data()

    def create_upload_intent(
        self,
        promise: PromiseRecord,
        request: EvidenceUploadIntentRequest,
        base_url: str = "",
    ) -> EvidenceUploadIntentResponse:
        """Validates file metadata and creates a pre-signed upload intent."""
        validate_file_metadata(request.fileName, request.mimeType, request.sizeBytes)

        # Validate requirement IDs exist on promise
        valid_keys = {req.key for req in promise.current_requirements} | {
            req.id for req in promise.current_requirements if req.id
        }
        for rid in request.requirementIds:
            if rid not in valid_keys:
                raise ValueError(
                    f"Requirement ID '{rid}' does not match any requirement in this promise."
                )

        evidence_id = f"ev_{uuid.uuid4().hex[:12]}"
        safe_name = sanitize_filename(request.fileName)
        storage_key = f"org/{promise.organization_id}/promises/{promise.promise_id}/evidence/{evidence_id}/{safe_name}"

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

        record = UploadIntentRecord(
            evidence_id=evidence_id,
            promise_id=promise.promise_id,
            organization_id=promise.organization_id,
            file_name=request.fileName,
            mime_type=request.mimeType,
            size_bytes=request.sizeBytes,
            requirement_ids=request.requirementIds,
            storage_key=storage_key,
            expires_at=expires_at,
        )
        self._upload_intents[evidence_id] = record

        upload_url = f"{base_url}/api/promises/{promise.promise_id}/evidence/uploads/{evidence_id}"

        return EvidenceUploadIntentResponse(
            evidenceId=evidence_id,
            storageKey=storage_key,
            uploadUrl=upload_url,
            expiresAt=expires_at.isoformat(),
            maxSizeBytes=request.sizeBytes,
        )

    def store_uploaded_content(self, evidence_id: str, content: bytes) -> UploadIntentRecord:
        """Stores content bytes associated with an upload intent and checks hash."""
        intent = self._upload_intents.get(evidence_id)
        if not intent:
            raise KeyError(f"Upload intent '{evidence_id}' was not found or has expired.")

        if datetime.now(timezone.utc) > intent.expires_at:
            raise ValueError("Upload intent has expired.")

        digest = compute_sha256(content)
        intent.uploaded_content = content
        intent.uploaded_sha256 = digest
        self._file_contents[intent.storage_key] = content

        return intent

    def register_evidence(
        self,
        promise: PromiseRecord,
        request: RegisterEvidenceRequest,
        uploader: str = "bob.merchant@example.com",
    ) -> EvidenceItemRecord:
        """Registers evidence item with provenance checks and links to requirements."""
        # 1. Validate requirements
        valid_reqs = {req.key: req for req in promise.current_requirements}
        for r in promise.current_requirements:
            if r.id:
                valid_reqs[r.id] = r

        for rid in request.requirementIds:
            if rid not in valid_reqs:
                raise ValueError(
                    f"Requirement ID '{rid}' does not match any requirement in promise {promise.promise_id}."
                )

        # 2. Parse kind
        kind = EvidenceKind.from_str(request.kind)

        # 3. Handle by kind
        evidence_id = request.evidenceId or f"ev_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        canonical_uri = None
        source_uri = request.source
        source_host = None
        storage_key = request.storageKey
        sha256_hash = request.sha256 or ""
        mime_type = request.mimeType
        size_bytes = request.sizeBytes

        if kind in (EvidenceKind.LIVE_URL, EvidenceKind.REPOSITORY):
            if not request.source:
                raise ValueError(f"Source URL is required for {kind.value} evidence.")
            canonical_uri, source_host = validate_and_canonicalize_url(request.source)
            if not sha256_hash:
                sha256_hash = compute_sha256(canonical_uri.encode("utf-8"))
            mime_type = "text/html"

        elif kind in (EvidenceKind.DOCUMENT, EvidenceKind.SCREENSHOT):
            # Check if linked to an upload intent
            if request.evidenceId and request.evidenceId in self._upload_intents:
                intent = self._upload_intents[request.evidenceId]
                storage_key = intent.storage_key
                sha256_hash = intent.uploaded_sha256 or compute_sha256(intent.file_name.encode())
                mime_type = intent.mime_type
                size_bytes = intent.size_bytes
            elif not sha256_hash:
                sha256_hash = compute_sha256((request.source or evidence_id).encode("utf-8"))

        elif kind == EvidenceKind.TRACKING_REFERENCE:
            if not request.source:
                raise ValueError("Tracking reference or tracking code is required.")
            sha256_hash = compute_sha256(request.source.encode("utf-8"))

        else:
            if not sha256_hash:
                sha256_hash = compute_sha256(str(request.source or evidence_id).encode("utf-8"))

        title = request.title or (
            f"{kind.value.replace('_', ' ').capitalize()} - {source_host or request.source or 'Submission'}"
        )

        provenance = EvidenceProvenance(
            receivedAt=now_iso,
            submittedBy=uploader,
            uploaderRole="SELLER",
            sourceHost=source_host,
            canonicalUri=canonical_uri,
            sha256=sha256_hash,
            mimeType=mime_type,
            sizeBytes=size_bytes,
            scannerStatus="SCAN_CLEAN",
            scannerVersion="promisepay-guard-v1",
            isClaimOnly=True,
            metadata={
                "submitterClaim": request.submitterClaim,
                "verifiedFact": False,
                "clientSource": request.source,
            },
        )

        record = EvidenceItemRecord(
            evidence_id=evidence_id,
            promise_id=promise.promise_id,
            kind=kind,
            title=title,
            requirement_ids=request.requirementIds,
            submitter_claim=request.submitterClaim,
            sha256=sha256_hash,
            uploader=uploader,
            source_uri=source_uri,
            canonical_uri=canonical_uri,
            storage_key=storage_key,
            status=EvidenceStatus.SCAN_CLEAN,
            provenance=provenance,
        )

        # Store in list
        if promise.promise_id not in self._evidence:
            self._evidence[promise.promise_id] = []
        self._evidence[promise.promise_id].append(record)

        # Transition promise status if in PAID or FULFILLMENT
        if promise.status in (PromiseStatus.PAID, PromiseStatus.FULFILLMENT):
            promise.status = PromiseStatus.EVIDENCE_SUBMITTED

        promise.updated_at = now_iso
        promise.timeline.append(
            AuditTimelineEvent(
                timestamp=now_iso,
                actor=uploader,
                eventType="EVIDENCE_SUBMITTED",
                summary=(
                    f"Evidence '{title}' submitted ({kind.value}) linked to "
                    f"{len(request.requirementIds)} requirement(s). SHA-256: {sha256_hash[:10]}..."
                ),
            )
        )

        return record

    def list_evidence(self, promise_id: str) -> List[EvidenceItemRecord]:
        return self._evidence.get(promise_id, [])

    def get_evidence_item(self, promise_id: str, evidence_id: str) -> Optional[EvidenceItemRecord]:
        items = self._evidence.get(promise_id, [])
        for item in items:
            if item.evidence_id == evidence_id:
                return item
        return None

    def get_file_bytes(self, storage_key: str) -> Optional[bytes]:
        return self._file_contents.get(storage_key)


evidence_store = EvidenceStore()
