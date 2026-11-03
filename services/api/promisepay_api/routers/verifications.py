"""FastAPI router for AI Verification runs (Phase 4).

Supports both asynchronous distributed queueing (202 Accepted with polling URL)
and deterministic synchronous verification.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Response, status

from promisepay_api.config import settings
from promisepay_api.models.verification import (
    CreateVerificationRequest,
    VerificationListResponse,
    VerificationOutcome,
    VerificationRunResponse,
    VerificationRunState,
)
from promisepay_api.services.evidence_store import evidence_store
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.queue import job_queue
from promisepay_api.services.verifier import (
    compute_evidence_manifest_hash,
    execute_verification_run,
    verification_store,
)

logger = logging.getLogger("promisepay-api.verifications")
router = APIRouter(tags=["verifications"])


@router.post(
    "/promises/{promise_id}/verifications",
    response_model=VerificationRunResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger or queue an explainable AI verification run",
)
async def create_verification_run(
    promise_id: str,
    response: Response,
    payload: Optional[CreateVerificationRequest] = None,
    sync: Optional[bool] = Query(None, description="Force synchronous execution"),
):
    """Executes or enqueues verification against frozen promise requirements and evidence manifest.

    Returns 202 Accepted with Location header for async queueing, or 201 Created for sync execution.
    """
    promise = promise_store.get(promise_id)
    if not promise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' not found.",
        )

    evidence_ids = payload.evidenceIds if payload else None
    force_rerun = payload.forceRerun if payload else False

    # Check whether synchronous execution is requested or forced by test environment
    is_sync = sync is True or (sync is None and settings.app_env.lower() == "test")

    if is_sync:
        try:
            run = await execute_verification_run(
                promise_id=promise_id,
                selected_evidence_ids=evidence_ids,
                force_rerun=force_rerun,
            )
            response.status_code = status.HTTP_201_CREATED
            return run
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
        except Exception as exc:
            logger.error("Verification execution error on %s: %s", promise_id, exc, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to execute verification run.",
            ) from exc

    # Asynchronous Distributed Queueing: Return 202 Accepted with polling location
    run_id = f"vr_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    all_evidence = [e.to_response() for e in evidence_store.list_evidence(promise_id)]
    manifest_hash = compute_evidence_manifest_hash(all_evidence)

    queued_run = VerificationRunResponse(
        runId=run_id,
        promiseId=promise_id,
        promiseVersion=len(promise.versions) if promise.versions else 1,
        state=VerificationRunState.QUEUED,
        outcome=None,
        overallConfidence=0.0,
        evidenceManifestHash=manifest_hash,
        results=[],
        startedAt=now,
        completedAt=None,
        deterministicChecks={"queueStatus": "ENQUEUED_DISTRIBUTED", "pollIntervalMs": 1000},
    )
    verification_store.save_run(queued_run)

    # Enqueue to distributed Redis/memory job queue
    req_manifest = [r.model_dump() for r in promise.current_requirements]
    ev_manifest = [e.model_dump() for e in all_evidence]
    await job_queue.enqueue(
        {
            "runId": run_id,
            "promiseId": promise_id,
            "requirements": req_manifest,
            "evidenceManifest": ev_manifest,
            "enqueuedAt": now,
        }
    )

    response.status_code = status.HTTP_202_ACCEPTED
    response.headers["Location"] = f"/api/promises/{promise_id}/verifications/{run_id}"
    return queued_run


@router.get(
    "/promises/{promise_id}/verifications/{run_id}",
    response_model=VerificationRunResponse,
    summary="Get verification run details and explainable findings",
)
async def get_verification_run(promise_id: str, run_id: str):
    """Retrieves a specific verification run result or status."""
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

    # Check if job completed in queue
    job_status = await job_queue.get_job_status(run_id)
    if job_status and job_status.get("status") == "COMPLETED" and run.state != VerificationRunState.COMPLETED:
        res = job_status.get("result", {})
        run.state = VerificationRunState.COMPLETED
        run.outcome = VerificationOutcome(res.get("outcome", "REVIEW_REQUIRED"))
        run.overallConfidence = res.get("overallConfidence", 0.0)
        run.completedAt = datetime.now(timezone.utc).isoformat()
        verification_store.save_run(run)

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
