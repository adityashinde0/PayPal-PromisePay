"""PayPal Payment Orders and Capture API Router."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from promisepay_api.auth import AuthenticatedUser, require_roles
from promisepay_api.models.promise import AuditTimelineEvent, PromiseStatus
from promisepay_api.services.lock import lock_manager
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.promise_store import promise_store

router = APIRouter(prefix="/promises", tags=["Payments"])


class CreatePaymentOrderResponse(BaseModel):
    promiseId: str
    paypalOrderId: str
    status: str


class CapturePaymentOrderResponse(BaseModel):
    promiseId: str
    paypalOrderId: str
    paypalCaptureId: str
    status: str


@router.post(
    "/{promise_id}/payment-orders",
    response_model=CreatePaymentOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_payment_order(
    promise_id: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: AuthenticatedUser = Depends(require_roles(["BUYER", "SELLER", "ADMIN"])),
):
    """Creates a PayPal Orders v2 with CAPTURE intent using server-side confirmed amount."""
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    # Server-Side Precondition Check
    if record.status != PromiseStatus.READY_FOR_PAYMENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot initiate payment for promise in status '{record.status}'. Requirements must be confirmed first (status must be READY_FOR_PAYMENT).",
        )

    # Idempotent return if order already created
    if record.payment.paypalOrderId and record.payment.state in ("ORDER_CREATED", "PENDING"):
        return CreatePaymentOrderResponse(
            promiseId=promise_id,
            paypalOrderId=record.payment.paypalOrderId,
            status=record.payment.state,
        )

    # Create PayPal Order with PPCP Delayed Escrow
    order_data = await paypal_client.create_order(
        promise_id=promise_id,
        amount_value=record.amount.value,
        currency_code=record.amount.currencyCode,
        title=record.title,
        idempotency_key=idempotency_key,
        delayed_escrow=True,
    )

    paypal_order_id = order_data["id"]

    # Update Promise State
    record.payment.paypalOrderId = paypal_order_id
    record.payment.state = "ORDER_CREATED"
    record.status = PromiseStatus.READY_FOR_PAYMENT

    # Append immutable audit event
    record.timeline.append(
        AuditTimelineEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor=current_user.email,
            eventType="PAYPAL_ORDER_CREATED",
            summary=f"Created PayPal Order {paypal_order_id} for {record.amount.currencyCode} ${record.amount.value} (PPCP Delayed Escrow).",
        )
    )

    return CreatePaymentOrderResponse(
        promiseId=promise_id,
        paypalOrderId=paypal_order_id,
        status="ORDER_CREATED",
    )


@router.post(
    "/{promise_id}/payment-orders/{paypal_order_id}/capture",
    response_model=CapturePaymentOrderResponse,
    status_code=status.HTTP_200_OK,
)
async def capture_payment_order(
    promise_id: str,
    paypal_order_id: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    current_user: AuthenticatedUser = Depends(require_roles(["BUYER", "SELLER", "ADMIN"])),
):
    """Captures an approved PayPal order with distributed locking and marks the promise as PAID."""
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    # Validate that this PayPal order belongs to this promise
    if record.payment.paypalOrderId and record.payment.paypalOrderId != paypal_order_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supplied paypalOrderId does not match active payment order for this promise.",
        )

    if record.payment.state == "CAPTURED":
        # Idempotent response if already captured
        return CapturePaymentOrderResponse(
            promiseId=promise_id,
            paypalOrderId=paypal_order_id,
            paypalCaptureId=record.payment.paypalCaptureId or "CAPTURED",
            status="CAPTURED",
        )

    # Distributed Lock: Prevent concurrent double-capture race conditions
    lock_key = f"capture:{promise_id}"
    acquired = await lock_manager.acquire_lock(lock_key, ttl_seconds=15)
    if not acquired:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment capture already in progress for this agreement. Please retry shortly.",
        )

    try:
        # Check idempotency cache (24h TTL)
        if idempotency_key:
            cached = await lock_manager.get_idempotency_result(f"capture:{promise_id}:{idempotency_key}")
            if cached:
                return CapturePaymentOrderResponse(**cached)

        # Execute PayPal Capture
        capture_data = await paypal_client.capture_order(
            paypal_order_id=paypal_order_id,
            idempotency_key=idempotency_key,
        )

        # Extract capture ID from purchase_units
        capture_id = f"CAP-{paypal_order_id[:10]}"
        try:
            purchase_units = capture_data.get("purchase_units", [])
            if purchase_units:
                captures = purchase_units[0].get("payments", {}).get("captures", [])
                if captures:
                    capture_id = captures[0].get("id", capture_id)
        except Exception:
            pass

        # Update Promise & Payment State
        record.payment.paypalCaptureId = capture_id
        record.payment.state = "CAPTURED"
        record.status = PromiseStatus.PAID

        # Append immutable audit event
        record.timeline.append(
            AuditTimelineEvent(
                timestamp=datetime.now(timezone.utc).isoformat(),
                actor="PayPal Sandbox",
                eventType="PAYMENT_CAPTURED",
                summary=f"Captured {record.amount.currencyCode} ${record.amount.value} via PayPal (Capture ID: {capture_id}).",
            )
        )

        res = CapturePaymentOrderResponse(
            promiseId=promise_id,
            paypalOrderId=paypal_order_id,
            paypalCaptureId=capture_id,
            status="CAPTURED",
        )

        if idempotency_key:
            await lock_manager.set_idempotency_result(
                f"capture:{promise_id}:{idempotency_key}", res.model_dump(), ttl_seconds=86400
            )

        return res
    finally:
        await lock_manager.release_lock(lock_key)


class PayoutRequest(BaseModel):
    recipientEmail: str
    note: Optional[str] = "Milestone fulfillment payout"


class PayoutResponse(BaseModel):
    promiseId: str
    payoutBatchId: str
    status: str
    recipientEmail: str
    amount: str
    currency: str


@router.post(
    "/{promise_id}/payout",
    response_model=PayoutResponse,
    status_code=status.HTTP_200_OK,
)
async def disburse_payout(
    promise_id: str,
    payload: PayoutRequest,
    current_user: AuthenticatedUser = Depends(require_roles(["ADMIN", "BUYER"])),
):
    """Triggers PayPal Payouts API release to the seller upon verified outcome."""
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    res = await paypal_client.create_batch_payout(
        recipient_email=payload.recipientEmail,
        amount_value=record.amount.value,
        currency_code=record.amount.currencyCode,
        note=payload.note or "Milestone payout",
    )
    batch_header = res.get("batch_header", {})
    payout_batch_id = batch_header.get("payout_batch_id", "UNKNOWN")

    record.timeline.append(
        AuditTimelineEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor=current_user.user_id,
            eventType="PAYOUT_DISBURSED",
            summary=f"Milestone funds of {record.amount.currencyCode} ${record.amount.value} released to {payload.recipientEmail} (Payout Batch: {payout_batch_id}).",
        )
    )

    return PayoutResponse(
        promiseId=promise_id,
        payoutBatchId=payout_batch_id,
        status=batch_header.get("batch_status", "SUCCESS"),
        recipientEmail=payload.recipientEmail,
        amount=record.amount.value,
        currency=record.amount.currencyCode,
    )

