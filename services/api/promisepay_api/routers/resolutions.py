"""FastAPI router for Resolution Cases, Reviewer Decisions & PayPal Refunds (Phase 5)."""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status

from promisepay_api.auth import AuthenticatedUser, require_roles
from promisepay_api.models.resolution import (
    ExecuteRefundRequest,
    OpenResolutionCaseRequest,
    RecordDecisionRequest,
    RefundResultResponse,
    ResolutionCaseListResponse,
    ResolutionCaseResponse,
)
from promisepay_api.services.evidence_guard import compute_sha256
from promisepay_api.services.evidence_store import evidence_store
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.resolution_store import resolution_store
from promisepay_api.services.rust_verifier import seal_dispute_dossier
from promisepay_api.services.transparency_log import generate_transparency_log_proof
from promisepay_api.services.verifier import verification_store

logger = logging.getLogger("promisepay-api.resolutions")
router = APIRouter(tags=["resolutions"])


@router.post(
    "/promises/{promise_id}/resolution-cases",
    response_model=ResolutionCaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Open a new resolution case for an agreement",
)
async def open_resolution_case(
    promise_id: str,
    payload: OpenResolutionCaseRequest,
):
    """Opens a resolution or dispute case against a promise from verification findings or user request."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' was not found.",
        )

    try:
        case = resolution_store.open_case(
            promise_id=promise_id,
            reason=payload.reason,
            requested_outcome=payload.requestedOutcome or "REVIEW",
            submitter=payload.submitter or "buyer@example.com",
            role=payload.role or "BUYER",
        )
        return case
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.get(
    "/promises/{promise_id}/resolution-cases",
    response_model=ResolutionCaseListResponse,
    summary="List all resolution cases for a promise",
)
async def list_resolution_cases(promise_id: str):
    """Retrieves all resolution cases linked to the given promise."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' was not found.",
        )

    cases = resolution_store.list_cases_for_promise(promise_id)
    return ResolutionCaseListResponse(
        promiseId=promise_id,
        items=cases,
        total=len(cases),
    )


@router.get(
    "/resolution-cases/{case_id}",
    response_model=ResolutionCaseResponse,
    summary="Get single resolution case details",
)
async def get_resolution_case(case_id: str):
    """Retrieves detailed resolution case history, timeline, and decision status."""
    case = resolution_store.get_case(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resolution case '{case_id}' was not found.",
        )
    return case


@router.post(
    "/resolution-cases/{case_id}/decisions",
    response_model=ResolutionCaseResponse,
    summary="Record human-gated reviewer decision",
)
async def record_case_decision(
    case_id: str,
    payload: RecordDecisionRequest,
    current_user: AuthenticatedUser = Depends(require_roles(["REVIEWER", "ADMIN"])),
):
    """Reviewer-only endpoint to record decision with mandatory justification. Does not move money."""
    case = resolution_store.get_case(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resolution case '{case_id}' was not found.",
        )

    try:
        updated = resolution_store.record_decision(
            case_id=case_id,
            decision=payload.decision,
            reason=payload.reason,
            reviewer=payload.reviewer or "reviewer@example.com",
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.post(
    "/resolution-cases/{case_id}/refunds",
    response_model=RefundResultResponse,
    summary="Execute PayPal captured-payment refund",
)
async def execute_case_refund(
    case_id: str,
    payload: ExecuteRefundRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: AuthenticatedUser = Depends(require_roles(["REVIEWER", "ADMIN"])),
):
    """Executes a PayPal Sandbox refund on captured funds. Enforces human gate and idempotency."""
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'Idempotency-Key' is required for payment refund execution.",
        )

    case = resolution_store.get_case(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resolution case '{case_id}' was not found.",
        )

    try:
        result = await resolution_store.execute_refund(
            case_id=case_id,
            idempotency_key=idempotency_key,
            reason=payload.reason,
            amount_value=payload.amountValue,
            actor=payload.actor or "admin@promisepay.example",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as exc:
        logger.error("Refund execution failure on case %s: %s", case_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute PayPal refund.",
        ) from exc


@router.get(
    "/promises/{promise_id}/dispute-defense-dossier",
    summary="Generate automated cryptographic PayPal Dispute Defense Dossier",
)
async def get_dispute_defense_dossier(
    promise_id: str,
    download: bool = False,
):
    """Generates an exportable dispute defense dossier compiling promise, PayPal references,

    SHA-256 evidence digests, and AI verification findings for PayPal Resolution Center submission.
    """
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' was not found.",
        )

    # 1. Evidence items with provenance
    evidence_items = evidence_store.list_evidence(promise_id)
    ev_list = [e.to_response().model_dump() for e in evidence_items]
    ev_hashes = [e.sha256 for e in evidence_items]

    # Compute aggregate manifest hash over all evidence hashes
    concat_hashes = ":".join(sorted(ev_hashes)) or "no_evidence"
    manifest_hash = compute_sha256(concat_hashes.encode("utf-8"))

    # 2. Latest AI verification run
    runs = verification_store.list_runs_for_promise(promise_id)
    latest_run = runs[0].model_dump() if runs else None
    ai_outcome = latest_run.get("outcome") if latest_run else "PENDING"

    # 3. Resolution history
    cases = resolution_store.list_cases_for_promise(promise_id)
    case_list = [c.model_dump() for c in cases]

    now = datetime.now(timezone.utc).isoformat()
    dossier_id = f"dos_{uuid.uuid4().hex[:12]}"

    # 4. Cryptographic Proof Engine (Rust-accelerated with deterministic Python fallback)
    crypto_proof = seal_dispute_dossier(
        promise_id=promise.promise_id,
        evidence_hashes=ev_hashes,
        requirements_count=len(promise.current_requirements),
        timestamp=now,
        paypal_order_id=promise.payment.paypalOrderId,
        paypal_capture_id=promise.payment.paypalCaptureId,
        ai_outcome=ai_outcome,
    )

    dossier_data = {
        "dossierId": dossier_id,
        "generatedAt": now,
        "promiseId": promise.promise_id,
        "complianceStatement": (
            "This cryptographic dispute defense dossier compiles the mutually agreed atomic requirements, "
            "server-enforced PayPal Sandbox payment references, immutable evidence artifacts (with SHA-256 digests), "
            "and automated requirement-level explainability verification. AI recommendations do not move money; "
            "all financial, refund, and dispute determinations remain strictly human-adjudicated under "
            "PayPal Acceptable Use and Seller Protection guidelines."
        ),
        "paypalDefenseReady": True,
        "cryptographicProof": crypto_proof,
        "transparencyLogProof": generate_transparency_log_proof(
            merkle_root=crypto_proof.get("merkle_root", ""),
            promise_id=promise.promise_id,
            timestamp=now,
        ),
        "agreement": {
            "title": promise.title,
            "category": promise.category.value
            if hasattr(promise.category, "value")
            else str(promise.category),
            "status": promise.status.value
            if hasattr(promise.status, "value")
            else str(promise.status),
            "currentVersion": len(promise.versions),
            "amount": promise.amount.model_dump(),
            "requirements": [r.model_dump() for r in promise.current_requirements],
            "approvedAt": promise.versions[-1].approvedAt if promise.versions else None,
            "approvedBy": promise.versions[-1].approvedBy if promise.versions else None,
        },
        "paypalTransaction": {
            "orderId": promise.payment.paypalOrderId,
            "captureId": promise.payment.paypalCaptureId,
            "state": promise.payment.state,
            "amount": promise.payment.amount.model_dump()
            if promise.payment.amount
            else promise.amount.model_dump(),
        },
        "cryptographicEvidence": {
            "totalItems": len(ev_list),
            "merkleRoot": crypto_proof.get("merkle_root"),
            "aggregateManifestHash": manifest_hash,
            "items": ev_list,
        },
        "aiVerificationAudit": {
            "hasVerification": latest_run is not None,
            "latestRunId": latest_run.get("runId") if latest_run else None,
            "outcome": latest_run.get("outcome") if latest_run else "PENDING",
            "overallConfidence": latest_run.get("overallConfidence") if latest_run else None,
            "manifestHash": latest_run.get("evidenceManifestHash") if latest_run else manifest_hash,
            "findings": latest_run.get("results") if latest_run else [],
        },
        "resolutionAudit": {
            "totalCases": len(case_list),
            "cases": case_list,
        },
    }

    if download:
        content = json.dumps(dossier_data, indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="dispute_dossier_{promise_id}.json"'
            },
        )

    return dossier_data
