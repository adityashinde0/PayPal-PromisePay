"""FastAPI router for AI Verification runs (Phase 4)."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status

from promisepay_api.models.verification import (
    CreateVerificationRequest,
    VerificationListResponse,
    VerificationRunResponse,
)
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.verifier import execute_verification_run, verification_store

logger = logging.getLogger("promisepay-api.verifications")
router = APIRouter(tags=["verifications"])


@router.post(
    "/promises/{promise_id}/verifications",
    response_model=VerificationRunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Trigger or queue an explainable AI verification run",
)
async def create_verification_run(
    promise_id: str,
    payload: Optional[CreateVerificationRequest] = None,
):
    """Executes verification against frozen promise requirements and evidence manifest."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' not found.",
        )

    evidence_ids = payload.evidenceIds if payload else None
    force_rerun = payload.forceRerun if payload else False

    try:
        run = await execute_verification_run(
            promise_id=promise_id,
            selected_evidence_ids=evidence_ids,
            force_rerun=force_rerun,
        )
        return run
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except Exception as exc:
        logger.error("Verification execution error on promise %s: %s", promise_id, exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to execute verification run.",
        ) from exc


@router.get(
    "/promises/{promise_id}/verifications/{run_id}",
    response_model=VerificationRunResponse,
    summary="Get verification run details and explainable findings",
)
async def get_verification_run(promise_id: str, run_id: str):
    """Retrieves a specific verification run result."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' not found.",
        )

    run = verification_store.get_run(run_id)
    if not run or run.promiseId != promise_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification run '{run_id}' not found for promise '{promise_id}'.",
        )

    return run


@router.get(
    "/promises/{promise_id}/verifications",
    response_model=VerificationListResponse,
    summary="List all verification runs for a promise",
)
async def list_verification_runs(promise_id: str):
    """Lists all historical verification runs for a given promise."""
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' not found.",
        )

    runs = verification_store.list_runs_for_promise(promise_id)
    return VerificationListResponse(
        promiseId=promise_id,
        runs=runs,
        total=len(runs),
    )
