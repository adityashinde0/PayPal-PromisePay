"""PayPal Payment Orders and Capture API Router."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from promisepay_api.auth import AuthenticatedUser, require_roles
from promisepay_api.models.promise import (
    AuditTimelineEvent,
    PromiseStatus,
    determine_payment_mode,
)
from promisepay_api.services.event_broadcaster import event_broadcaster
from promisepay_api.services.lock import lock_manager
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.promise_store import promise_store

logger = logging.getLogger("promisepay-payments")
router = APIRouter(prefix="/promises", tags=["Payments"])


class CreatePaymentOrderResponse(BaseModel):
    promiseId: str
    paypalOrderId: str
    status: str
    paymentMode: Optional[str] = None


class CapturePaymentOrderResponse(BaseModel):
    promiseId: str
    paypalOrderId: str
    paypalCaptureId: str
    status: str
    paymentMode: Optional[str] = None


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
            paymentMode=record.payment.paymentMode,
        )

    # Create PayPal Order with PPCP Delayed Escrow
    try:
        order_data = await paypal_client.create_order(
            promise_id=promise_id,
            amount_value=record.amount.value,
            currency_code=record.amount.currencyCode,
            title=record.title,
            idempotency_key=idempotency_key,
            delayed_escrow=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"PayPal order creation failed: {exc}",
        ) from exc

    paypal_order_id = order_data["id"]
    now_iso = datetime.now(timezone.utc).isoformat()

    # Update Promise State
    record.payment.paypalOrderId = paypal_order_id
    record.payment.state = "ORDER_CREATED"
    record.payment.createdAt = now_iso
    record.payment.buyerApproved = False
    record.payment.paymentMode = determine_payment_mode("ORDER_CREATED", paypal_order_id, None)
    record.status = PromiseStatus.READY_FOR_PAYMENT

    # Append immutable audit event
    record.timeline.append(
        AuditTimelineEvent(
            timestamp=now_iso,
            actor=current_user.email,
            eventType="PAYPAL_ORDER_CREATED",
            summary=f"Created PayPal Order {paypal_order_id} for {record.amount.currencyCode} ${record.amount.value} (PPCP Delayed Escrow).",
        )
    )

    # Durable persistence (safe non-blocking)
    try:
        from promisepay_api.db.repository import DatabaseRepository

        await DatabaseRepository.save_payment(
            promise_id=promise_id,
            paypal_order_id=paypal_order_id,
            paypal_capture_id=None,
            state="ORDER_CREATED",
            amount_value=float(record.amount.value),
            currency_code=record.amount.currencyCode,
            buyer_approved=False,
            webhook_verified=False,
            payment_mode=record.payment.paymentMode,
            idempotency_key=idempotency_key,
            raw_response=order_data,
        )
    except Exception as db_exc:
        logger.debug("Durable DB payment record deferred or skipped: %s", db_exc)

    return CreatePaymentOrderResponse(
        promiseId=promise_id,
        paypalOrderId=paypal_order_id,
        status="ORDER_CREATED",
        paymentMode=record.payment.paymentMode,
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
            paymentMode=record.payment.paymentMode,
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
            cached = await lock_manager.get_idempotency_result(
                f"capture:{promise_id}:{idempotency_key}"
            )
            if cached:
                return CapturePaymentOrderResponse(**cached)

        now_iso = datetime.now(timezone.utc).isoformat()

        # Execute PayPal Capture
        try:
            capture_data = await paypal_client.capture_order(
                paypal_order_id=paypal_order_id,
                idempotency_key=idempotency_key,
            )
        except Exception as exc:
            record.payment.state = "FAILED"
            record.payment.failureReason = str(exc)
            record.payment.paymentMode = "Payment Failed"
            record.timeline.append(
                AuditTimelineEvent(
                    timestamp=now_iso,
                    actor="PayPal Sandbox",
                    eventType="PAYMENT_FAILED",
                    summary=f"Payment capture failed: {exc}",
                )
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"PayPal capture failed: {exc}",
            ) from exc

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

        if capture_data.get("status") not in ("COMPLETED", "PENDING"):
            status_desc = capture_data.get("status")
            record.payment.state = "FAILED"
            record.payment.failureReason = f"PayPal capture status was not completed: {status_desc}"
            record.payment.paymentMode = "Payment Failed"
            record.timeline.append(
                AuditTimelineEvent(
                    timestamp=now_iso,
                    actor="PayPal Sandbox",
                    eventType="PAYMENT_FAILED",
                    summary=f"PayPal capture status was not completed: {status_desc}",
                )
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"PayPal capture status was not completed: {status_desc}",
            )

        # Update Promise & Payment State
        record.payment.paypalCaptureId = capture_id
        record.payment.state = "CAPTURED"
        record.payment.buyerApproved = True
        record.payment.capturedAt = now_iso
        record.payment.failureReason = None
        record.payment.paymentMode = determine_payment_mode("CAPTURED", paypal_order_id, capture_id)
        record.status = PromiseStatus.PAID

        # Append immutable audit event
        record.timeline.append(
            AuditTimelineEvent(
                timestamp=now_iso,
                actor="PayPal Sandbox",
                eventType="PAYMENT_CAPTURED",
                summary=f"Captured {record.amount.currencyCode} ${record.amount.value} via PayPal (Capture ID: {capture_id}). Mode: {record.payment.paymentMode}.",
            )
        )

        # Durable persistence (safe non-blocking)
        try:
            from promisepay_api.db.repository import DatabaseRepository

            await DatabaseRepository.save_payment(
                promise_id=promise_id,
                paypal_order_id=paypal_order_id,
                paypal_capture_id=capture_id,
                state="CAPTURED",
                amount_value=float(record.amount.value),
                currency_code=record.amount.currencyCode,
                buyer_approved=True,
                webhook_verified=record.payment.webhookVerified,
                payment_mode=record.payment.paymentMode,
                idempotency_key=idempotency_key,
                raw_response=capture_data,
            )
        except Exception as db_exc:
            logger.debug("Durable DB payment record deferred or skipped: %s", db_exc)

        # Broadcast payment captured event (Goal 4)
        await event_broadcaster.broadcast_event(
            promise_id=promise_id,
            event_type="PAYMENT_CAPTURED",
            payload={
                "paypalCaptureId": capture_id,
                "amount": record.amount.value,
                "currency": record.amount.currencyCode,
                "status": "PAID",
                "paymentMode": record.payment.paymentMode,
            },
        )

        res = CapturePaymentOrderResponse(
            promiseId=promise_id,
            paypalOrderId=paypal_order_id,
            paypalCaptureId=capture_id,
            status="CAPTURED",
            paymentMode=record.payment.paymentMode,
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


class PartnerReferralRequest(BaseModel):
    trackingId: Optional[str] = None
    returnUrl: Optional[str] = "http://localhost:3000/settings"


@router.post(
    "/partner-referrals",
    summary="Create PayPal Partner Referral onboarding URL (Goal 3)",
)
async def create_partner_referral(
    payload: PartnerReferralRequest,
    current_user: AuthenticatedUser = Depends(require_roles(["SELLER", "ADMIN"])),
):
    """Generates automated onboarding link for merchants to connect PayPal business accounts."""
    tracking_id = payload.trackingId or f"track_{current_user.userId}"
    referral = await paypal_client.create_partner_referral(
        tracking_id=tracking_id,
        return_url=payload.returnUrl or "http://localhost:3000/settings",
    )
    return referral


@router.get(
    "/merchants/{merchant_id}/status",
    summary="Query PayPal merchant account onboarding status (Goal 3)",
)
async def get_merchant_status(
    merchant_id: str,
    current_user: AuthenticatedUser = Depends(
        require_roles(["BUYER", "SELLER", "REVIEWER", "ADMIN"])
    ),
):
    """Returns real-time PayPal onboarding and PPCP capability readiness."""
    return await paypal_client.get_merchant_status(merchant_id=merchant_id)


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
