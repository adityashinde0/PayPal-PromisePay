"""FastAPI router for Resolution Cases, Reviewer Decisions & PayPal Refunds (Phase 5)."""

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status

from promisepay_api.models.resolution import (
    ExecuteRefundRequest,
    OpenResolutionCaseRequest,
    RecordDecisionRequest,
    RefundResultResponse,
    ResolutionCaseListResponse,
    ResolutionCaseResponse,
)
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.resolution_store import resolution_store

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
