"""PayPal Webhook Handler Router."""

import json
import logging
from pathlib import Path
from typing import Set

from fastapi import APIRouter, HTTPException, Request, status

from promisepay_api.models.promise import AuditTimelineEvent, PromiseStatus
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.promise_store import promise_store

logger = logging.getLogger("promisepay-webhooks")
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# Durable event deduplication store
PROCESSED_EVENT_IDS: Set[str] = set()
_STORAGE_FILE = (
    Path(__file__).resolve().parent.parent.parent.parent.parent
    / ".storage"
    / "processed_paypal_events.txt"
)


def _load_persisted_events():
    if _STORAGE_FILE.is_file():
        try:
            for line in _STORAGE_FILE.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    PROCESSED_EVENT_IDS.add(line.strip())
        except Exception as err:
            logger.warning("Could not read persisted events file: %s", err)


def _persist_event(event_id: str):
    PROCESSED_EVENT_IDS.add(event_id)
    try:
        _STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(_STORAGE_FILE, "a", encoding="utf-8") as f:
            f.write(f"{event_id}\n")
    except Exception as err:
        logger.warning("Could not persist event ID %s: %s", event_id, err)


_load_persisted_events()


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

    _persist_event(event_id)
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

        elif event_type in ("CUSTOMER.DISPUTE.CREATED", "CUSTOMER.DISPUTE.UPDATED"):
            dispute_id = resource.get("dispute_id") or resource.get("id")
            target_promise.status = PromiseStatus.REVIEW_REQUIRED
            target_promise.timeline.append(
                AuditTimelineEvent(
                    timestamp=now,
                    actor="PayPal Disputes Webhook",
                    eventType="PAYPAL_DISPUTE_OPENED",
                    summary=f"PayPal Dispute {dispute_id} opened. Initiating automated Merkle dossier compilation.",
                )
            )
            # Programmatically compile and upload cryptographic evidence dossier
            if dispute_id:
                try:
                    from promisepay_api.routers.resolutions import generate_dispute_defense_dossier

                    dossier = await generate_dispute_defense_dossier(
                        promise_id=target_promise.promise_id, download=False
                    )
                    await paypal_client.provide_dispute_evidence(dispute_id, dossier)
                    logger.info(
                        "Automatically provided cryptographic Merkle dossier for dispute %s",
                        dispute_id,
                    )
                except Exception as exc:
                    logger.warning(
                        "Failed to auto-submit dispute dossier for %s: %s", dispute_id, exc
                    )

    return {"status": "processed", "eventId": event_id, "eventType": event_type}
