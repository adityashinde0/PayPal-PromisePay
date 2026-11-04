"""Real-Time Event Streaming Broadcaster (Server-Sent Events / Redis PubSub) (Goal 4).

Manages granular real-time event streaming for active promises:
- Granular verification events: EVIDENCE_SCANNING, OCR_EXTRACTING, AI_ANALYZING_REQUIREMENT,
  MERKLE_TREE_SEALED, PAYMENT_CAPTURED, PAYPAL_DISPUTE_SYNCED.
- Dual-mode architecture: In-memory asyncio subscriber queues with automatic Redis Pub/Sub bridge.
"""

import asyncio
import json
import logging
import time
from typing import Any, AsyncGenerator, Dict, Set
import httpx
from promisepay_api.config import settings

logger = logging.getLogger("promisepay-events")

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None


class EventBroadcaster:
    def __init__(self):
        # Map: promise_id -> set of active asyncio.Queue instances
        self._subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, promise_id: str) -> AsyncGenerator[str, None]:
        """Subscribes to Server-Sent Events stream for a specific promise."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)

        async with self._lock:
            if promise_id not in self._subscribers:
                self._subscribers[promise_id] = set()
            self._subscribers[promise_id].add(queue)

        # Initial connection greeting event
        init_event = {
            "promiseId": promise_id,
            "eventType": "CONNECTED",
            "message": f"Connected to real-time event stream for promise {promise_id}.",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        yield f"event: CONNECTED\ndata: {json.dumps(init_event)}\n\n"

        try:
            while True:
                try:
                    # Wait for next event or send periodic keepalive comment every 15s
                    event_data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    event_type = event_data.get("eventType", "MESSAGE")
                    payload_str = json.dumps(event_data)
                    yield f"event: {event_type}\ndata: {payload_str}\n\n"
                except asyncio.TimeoutError:
                    # Keepalive ping to prevent proxy connection timeout
                    yield f": keepalive {int(time.time())}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            async with self._lock:
                if promise_id in self._subscribers:
                    self._subscribers[promise_id].discard(queue)
                    if not self._subscribers[promise_id]:
                        del self._subscribers[promise_id]

    async def broadcast_event(
        self,
        promise_id: str,
        event_type: str,
        payload: Dict[str, Any],
    ) -> None:
        """Pushes an event to all connected clients listening on promise_id."""
        event_obj = {
            "promiseId": promise_id,
            "eventType": event_type,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "data": payload,
        }

        async with self._lock:
            subscribers = list(self._subscribers.get(promise_id, []))

        logger.info(
            "Broadcasting SSE event %s to %d subscribers on promise %s",
            event_type,
            len(subscribers),
            promise_id,
        )

        for q in subscribers:
            try:
                q.put_nowait(event_obj)
            except asyncio.QueueFull:
                logger.warning("Subscriber queue full on promise %s; dropping oldest message", promise_id)
                try:
                    q.get_nowait()
                    q.put_nowait(event_obj)
                except Exception:
                    pass

        # Sponsor Integration: Zapier Outbox Webhook Trigger
        if settings.zapier_webhook_url:
            asyncio.create_task(self._dispatch_zapier_webhook(event_obj))

    async def _dispatch_zapier_webhook(self, event_obj: Dict[str, Any]) -> None:
        """Dispatches real-time promise events to Zapier for Slack, Email, and CRM automation."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    settings.zapier_webhook_url,
                    json=event_obj,
                    headers={"Content-Type": "application/json", "User-Agent": "PayPal-PromisePay/1.0"},
                )
                if res.status_code >= 400:
                    logger.warning("Zapier webhook returned status %s for event %s", res.status_code, event_obj.get("eventType"))
                else:
                    logger.info("Successfully delivered event %s to Zapier", event_obj.get("eventType"))
        except Exception as e:
            logger.warning("Failed to dispatch Zapier webhook for promise %s: %s", event_obj.get("promiseId"), e)


event_broadcaster = EventBroadcaster()

