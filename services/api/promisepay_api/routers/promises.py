"""Promise management API router."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from promisepay_api.models.promise import (
    AtomicRequirement,
    AuditTimelineEvent,
    CreatePromiseRequest,
    PromiseCategory,
    PromiseGraphResponse,
    PromiseListResponse,
    PromiseStatus,
    UpdatePromiseRequest,
)
from promisepay_api.services.event_broadcaster import event_broadcaster
from promisepay_api.services.extractor import extract_requirements
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.templates import get_template_requirements

router = APIRouter(prefix="/promises", tags=["Promises"])


@router.get("", response_model=PromiseListResponse)
async def list_promises(
    category: Optional[PromiseCategory] = Query(None, description="Filter by category"),
    status_filter: Optional[PromiseStatus] = Query(
        None, alias="status", description="Filter by lifecycle status"
    ),
    q: Optional[str] = Query(None, description="Search by title or Promise ID"),
):
    """Retrieves list of promises for the Promise Ledger."""
    records = promise_store.list(category=category, status=status_filter, q=q)
    return PromiseListResponse(
        items=[r.to_summary_response() for r in records],
        total=len(records),
    )


@router.get("/templates/{category}", response_model=List[AtomicRequirement])
async def get_category_template(category: PromiseCategory):
    """Returns the default atomic requirements for a given category."""
    return get_template_requirements(category)


@router.post("", response_model=PromiseGraphResponse, status_code=status.HTTP_201_CREATED)
async def create_promise(req: CreatePromiseRequest):
    """Creates a draft promise, runs requirement extraction, and creates initial version."""
    extracted_reqs = await extract_requirements(req.category, req.promiseText)

    record = promise_store.create(
        category=req.category,
        title=req.title,
        promise_text=req.promiseText,
        amount=req.amount,
        requirements=extracted_reqs,
        merchant_order_ref=req.merchantOrderRef,
    )
    return record.to_graph_response()


@router.get("/{promise_id}", response_model=PromiseGraphResponse)
async def get_promise(promise_id: str):
    """Retrieves full Promise Graph projection by Promise ID."""
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )
    return record.to_graph_response()


@router.patch("/{promise_id}", response_model=PromiseGraphResponse)
async def update_promise(promise_id: str, req: UpdatePromiseRequest):
    """Updates editable draft/ready-for-payment promise and requirements, creating a new version."""
    try:
        updated = promise_store.update(
            promise_id=promise_id,
            title=req.title,
            promise_text=req.promiseText,
            requirements=req.requirements,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )
    return updated.to_graph_response()


@router.post("/{promise_id}/confirm", response_model=PromiseGraphResponse)
async def confirm_promise(promise_id: str):
    """Explicit merchant confirmation of extracted/edited requirements, locking for checkout."""
    try:
        confirmed = promise_store.confirm(promise_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    if not confirmed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )
    return confirmed.to_graph_response()


class CancelPromiseRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)
    cancellationType: str = Field(
        default="USER_CANCELLED",
        description="Reason category: USER_CANCELLED or SLA_TIMEOUT_NOT_DELIVERED",
    )
    actor: Optional[str] = None


@router.post(
    "/{promise_id}/cancel",
    summary="Cancel agreement and trigger automatic PayPal refund if paid",
)
async def cancel_promise(
    promise_id: str,
    payload: CancelPromiseRequest,
):
    """Cancels the agreement. If payment was already captured, executes an immediate PayPal Sandbox refund."""
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    if record.status in (PromiseStatus.CANCELLED, PromiseStatus.RESOLVED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Promise is already in '{record.status}' status.",
        )

    now = datetime.now(timezone.utc).isoformat()
    actor = payload.actor or "buyer@promisepay.example"

    # Case 1: Payment was captured -> Execute PayPal Refund
    if record.payment.state == "CAPTURED" and record.payment.paypalCaptureId:
        idempotency_key = f"cancel_ref_{promise_id}_{uuid.uuid4().hex[:8]}"
        try:
            refund_res = await paypal_client.refund_capture(
                paypal_capture_id=record.payment.paypalCaptureId,
                amount_value=record.amount.value,
                currency_code=record.amount.currencyCode,
                reason=f"Cancellation [{payload.cancellationType}]: {payload.reason}",
                idempotency_key=idempotency_key,
            )
            refund_id = refund_res.get("id", f"REF_{uuid.uuid4().hex[:8].upper()}")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"PayPal refund failed: {str(exc)}",
            ) from exc

        record.payment.state = "REFUNDED"
        record.status = PromiseStatus.CANCELLED
        record.updated_at = now

        record.timeline.append(
            AuditTimelineEvent(
                timestamp=now,
                actor=actor,
                eventType="PROMISE_CANCELLED_REFUNDED",
                summary=(
                    f"Agreement cancelled ({payload.cancellationType}: '{payload.reason}'). "
                    f"Full refund of {record.amount.currencyCode} ${record.amount.value} "
                    f"executed via PayPal (Refund ID: {refund_id})."
                ),
            )
        )

        await event_broadcaster.broadcast_event(
            promise_id=promise_id,
            event_type="PAYPAL_DISPUTE_RESOLVED",
            payload={
                "status": "CANCELLED_AND_REFUNDED",
                "paypalRefundId": refund_id,
                "amount": record.amount.value,
                "currency": record.amount.currencyCode,
                "reason": payload.reason,
            },
        )

        return {
            "status": "CANCELLED_AND_REFUNDED",
            "promiseId": promise_id,
            "refundExecuted": True,
            "paypalRefundId": refund_id,
            "amount": record.amount.value,
            "currency": record.amount.currencyCode,
            "cancellationType": payload.cancellationType,
            "reason": payload.reason,
            "promise": record.to_graph_response(),
        }

    # Case 2: Payment was not captured yet
    record.status = PromiseStatus.CANCELLED
    record.payment.state = "CANCELLED"
    record.updated_at = now

    record.timeline.append(
        AuditTimelineEvent(
            timestamp=now,
            actor=actor,
            eventType="PROMISE_CANCELLED",
            summary=(
                f"Agreement cancelled before payment ({payload.cancellationType}: '{payload.reason}'). "
                "No charge was made."
            ),
        )
    )

    return {
        "status": "CANCELLED",
        "promiseId": promise_id,
        "refundExecuted": False,
        "cancellationType": payload.cancellationType,
        "reason": payload.reason,
        "promise": record.to_graph_response(),
    }


class PartnerReferralPayload(BaseModel):
    trackingId: Optional[str] = None
    returnUrl: Optional[str] = "http://localhost:3000/settings"


@router.post("/partner-referrals")
async def create_partner_referrals_alias(payload: PartnerReferralPayload):
    """Creates PayPal Partner Referral onboarding URL alias."""
    tracking_id = payload.trackingId or f"track_{uuid.uuid4().hex[:12]}"
    referral = await paypal_client.create_partner_referral(
        tracking_id=tracking_id,
        return_url=payload.returnUrl or "http://localhost:3000/settings",
    )
    return referral


@router.get("/merchants/{merchant_id}/status")
async def get_merchant_status_alias(merchant_id: str):
    """Query PayPal merchant account onboarding status alias."""
    status_data = await paypal_client.get_merchant_status(merchant_id)
    return status_data
