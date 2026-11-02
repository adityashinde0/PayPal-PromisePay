"""PayPal Payment Orders and Capture API Router."""

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from promisepay_api.models.promise import PromiseStatus
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
):
    """Creates a PayPal Orders v2 with CAPTURE intent using server-side confirmed amount."""
    record = promise_store.get(promise_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Promise with ID '{promise_id}' was not found.",
        )

    if record.status not in (PromiseStatus.READY_FOR_PAYMENT, PromiseStatus.PAYMENT_PENDING):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot initiate payment for promise in status {record.status}. Must be READY_FOR_PAYMENT.",
        )

    # Server-enforced pricing: use locked promise.amount
    order_data = await paypal_client.create_order(
        promise_id=promise_id,
        amount_value=record.amount.value,
        currency_code=record.amount.currencyCode,
        title=record.title,
        idempotency_key=idempotency_key,
    )

    paypal_order_id = order_data["id"]
    record.payment.paypalOrderId = paypal_order_id
    record.payment.state = "ORDER_CREATED"
    record.status = PromiseStatus.PAYMENT_PENDING
    record.updated_at = record.created_at

    return CreatePaymentOrderResponse(
        promiseId=promise_id,
        paypalOrderId=paypal_order_id,
        status="ORDER_CREATED",
    )


@router.post(
    "/{promise_id}/payment-orders/{paypal_order_id}/capture",
    response_model=CapturePaymentOrderResponse,
)
async def capture_payment_order(
    promise_id: str,
    paypal_order_id: str,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """Captures an approved PayPal order and marks the promise as PAID."""
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
    from datetime import datetime, timezone

    from promisepay_api.models.promise import AuditTimelineEvent

    record.timeline.append(
        AuditTimelineEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor="PayPal Sandbox",
            eventType="PAYMENT_CAPTURED",
            summary=f"Captured {record.amount.currencyCode} ${record.amount.value} via PayPal (Capture ID: {capture_id}).",
        )
    )

    return CapturePaymentOrderResponse(
        promiseId=promise_id,
        paypalOrderId=paypal_order_id,
        paypalCaptureId=capture_id,
        status="CAPTURED",
    )
