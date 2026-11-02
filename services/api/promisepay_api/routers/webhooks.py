"""PayPal Webhook Handler Router."""

import json
import logging
from typing import Set

from fastapi import APIRouter, HTTPException, Request, status

from promisepay_api.models.promise import AuditTimelineEvent, PromiseStatus
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.promise_store import promise_store

logger = logging.getLogger("promisepay-webhooks")
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# Set of processed PayPal Event IDs for idempotency
PROCESSED_EVENT_IDS: Set[str] = set()


@router.post("/paypal", status_code=status.HTTP_200_OK)
async def handle_paypal_webhook(request: Request):
    """Secure PayPal Webhook endpoint.

    Verifies raw body signature, deduplicates event ID, reconciles payment state,
    and returns 200 OK only upon durable acceptance.
    """
    raw_body = await request.body()
    headers_dict = {k.lower(): v for k, v in request.headers.items()}

    # 1. Verify Signature
    is_valid, reason = await paypal_client.verify_webhook_signature(raw_body, headers_dict)
    if not is_valid:
        logger.warning("Rejected invalid PayPal webhook signature: %s", reason)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid webhook signature: {reason}",
        )

    # 2. Parse Event Payload
    try:
        event = json.loads(raw_body.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON in webhook body",
        ) from exc

    event_id = event.get("id")
    event_type = event.get("event_type", "UNKNOWN")
    resource = event.get("resource", {})

    if not event_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing event ID")

    # 3. Deduplication Check (Idempotent receipt)
    if event_id in PROCESSED_EVENT_IDS:
        logger.info("Ignoring duplicate PayPal webhook event: %s (%s)", event_id, event_type)
        return {"status": "already_processed", "eventId": event_id}

    PROCESSED_EVENT_IDS.add(event_id)
    logger.info("Processing PayPal webhook event %s: %s", event_id, event_type)

    # 4. Correlate with Promise
    custom_id = resource.get("custom_id")
    paypal_order_id = resource.get("id") or resource.get("order_id")

    # Search for matching promise by custom_id or paypal_order_id
    target_promise = None
    if custom_id:
        target_promise = promise_store.get(custom_id)

    if not target_promise and paypal_order_id:
        for p in promise_store.list():
            if p.payment.paypalOrderId == paypal_order_id:
                target_promise = p
                break

    # 5. Reconcile Payment Lifecycle States
    if target_promise:
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat()

        if event_type == "CHECKOUT.ORDER.APPROVED":
            target_promise.payment.state = "APPROVED"
            target_promise.status = PromiseStatus.PAYMENT_PENDING
            target_promise.timeline.append(
                AuditTimelineEvent(
                    timestamp=now,
                    actor="PayPal Webhook",
                    eventType="ORDER_APPROVED",
                    summary=f"Buyer approved PayPal checkout order {paypal_order_id}.",
                )
            )

        elif event_type == "PAYMENT.CAPTURE.COMPLETED":
            capture_id = resource.get("id")
            target_promise.payment.state = "CAPTURED"
            if capture_id:
                target_promise.payment.paypalCaptureId = capture_id
            target_promise.status = PromiseStatus.PAID
            target_promise.timeline.append(
                AuditTimelineEvent(
                    timestamp=now,
                    actor="PayPal Webhook",
                    eventType="CAPTURE_COMPLETED",
                    summary=f"Capture {capture_id or ''} completed via PayPal webhook reconciliation.",
                )
            )

        elif event_type == "PAYMENT.CAPTURE.DENIED":
            target_promise.payment.state = "FAILED"
            target_promise.timeline.append(
                AuditTimelineEvent(
                    timestamp=now,
                    actor="PayPal Webhook",
                    eventType="CAPTURE_DENIED",
                    summary="PayPal payment capture was denied.",
                )
            )

        elif event_type == "PAYMENT.CAPTURE.REFUNDED":
            target_promise.payment.state = "REFUNDED"
            target_promise.timeline.append(
                AuditTimelineEvent(
                    timestamp=now,
                    actor="PayPal Webhook",
                    eventType="CAPTURE_REFUNDED",
                    summary="Payment refunded in PayPal.",
                )
            )

    return {"status": "processed", "eventId": event_id, "eventType": event_type}
