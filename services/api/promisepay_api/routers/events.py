"""Server-Sent Events (SSE) Streaming Router (Goal 4)."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from promisepay_api.services.event_broadcaster import event_broadcaster
from promisepay_api.services.promise_store import promise_store

logger = logging.getLogger("promisepay-events-router")
router = APIRouter(prefix="/promises", tags=["Real-Time Streaming"])


class ManualEventRequest(BaseModel):
    eventType: str
    payload: Dict[str, Any] = {}


@router.get(
    "/{promise_id}/events",
    summary="Subscribe to live Server-Sent Events stream for a promise (Goal 4)",
)
async def stream_promise_events(promise_id: str, request: Request):
    """Establishes an HTTP SSE connection streaming granular agent progress events.

    Events streamed:
    - EVIDENCE_SCANNING
    - OCR_EXTRACTING
    - AI_ANALYZING_REQUIREMENT
    - MERKLE_TREE_SEALED
    - PAYMENT_CAPTURED
    - PAYPAL_DISPUTE_SYNCED
    """
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' was not found.",
        )

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
    }

    return StreamingResponse(
        event_broadcaster.subscribe(promise_id),
        media_type="text/event-stream",
        headers=headers,
    )


@router.post(
    "/{promise_id}/events",
    summary="Publish an event to the real-time stream",
    status_code=status.HTTP_202_ACCEPTED,
)
async def publish_promise_event(promise_id: str, body: ManualEventRequest):
    """Broadcasts a real-time event to all active stream listeners."""
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise '{promise_id}' was not found.",
        )

    await event_broadcaster.broadcast_event(
        promise_id=promise_id,
        event_type=body.eventType,
        payload=body.payload,
    )
    return {"status": "BROADCASTED", "promiseId": promise_id, "eventType": body.eventType}
