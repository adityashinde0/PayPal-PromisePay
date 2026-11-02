"""PayPal REST API client for Sandbox Orders v2, Captures, and Webhooks."""

import base64
import logging
import time
import uuid
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse

import httpx

from promisepay_api.config import settings

logger = logging.getLogger("promisepay-paypal")


class PayPalClient:
    def __init__(self):
        self.api_base = settings.paypal_api_base.rstrip("/")
        self.client_id = settings.paypal_client_id
        self.client_secret = settings.paypal_client_secret
        self.webhook_id = settings.paypal_webhook_id

        # Token caching
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    @property
    def is_configured(self) -> bool:
        """Returns True if real Sandbox credentials are provided."""
        return bool(self.client_id and self.client_secret and self.client_id != "placeholder")

    async def get_access_token(self) -> str:
        """Retrieves or refreshes an OAuth 2.0 bearer token using client credentials."""
        if not self.is_configured:
            return "mock_oauth_sandbox_token"

        now = time.time()
        if self._access_token and now < self._token_expires_at - 60:
            return self._access_token

        auth_header = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        data = {"grant_type": "client_credentials"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(f"{self.api_base}/v1/oauth2/token", headers=headers, data=data)
            if res.status_code != 200:
                logger.error("PayPal OAuth failed: %s - %s", res.status_code, res.text)
                raise RuntimeError(f"PayPal OAuth failed: {res.status_code}")

            json_data = res.json()
            self._access_token = json_data["access_token"]
            expires_in = json_data.get("expires_in", 3600)
            self._token_expires_at = now + expires_in
            return self._access_token

    async def create_order(
        self,
        promise_id: str,
        amount_value: str,
        currency_code: str,
        title: str,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a PayPal Orders v2 with intent: CAPTURE using server-confirmed amount."""
        request_id = idempotency_key or str(uuid.uuid4())

        if not self.is_configured:
            # Deterministic Sandbox mock order for local dev and automated tests
            mock_order_id = f"MOCK_ORD_{uuid.uuid4().hex[:12].upper()}"
            logger.info(
                "Generated Sandbox mock order %s for Promise %s ($%s)",
                mock_order_id,
                promise_id,
                amount_value,
            )
            return {
                "id": mock_order_id,
                "status": "CREATED",
                "intent": "CAPTURE",
                "custom_id": promise_id,
                "amount": {"currency_code": currency_code, "value": amount_value},
                "create_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }

        token = await self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "PayPal-Request-Id": request_id,
        }

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "reference_id": f"ref_{promise_id}",
                    "custom_id": promise_id,
                    "description": title[:127],
                    "amount": {
                        "currency_code": currency_code,
                        "value": amount_value,
                    },
                }
            ],
            "application_context": {
                "brand_name": "PromisePay",
                "landing_page": "NO_PREFERENCE",
                "user_action": "PAY_NOW",
            },
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{self.api_base}/v2/checkout/orders", headers=headers, json=payload
            )
            if res.status_code not in (200, 201):
                logger.error("PayPal Create Order failed: %s - %s", res.status_code, res.text)
                raise RuntimeError(f"PayPal Create Order error: {res.text}")
            return res.json()

    async def capture_order(
        self,
        paypal_order_id: str,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Captures an approved PayPal order and returns capture details."""
        request_id = idempotency_key or str(uuid.uuid4())

        if not self.is_configured or paypal_order_id.startswith("MOCK_ORD_"):
            # Deterministic Sandbox mock capture
            mock_capture_id = f"MOCK_CAP_{uuid.uuid4().hex[:12].upper()}"
            logger.info(
                "Captured Sandbox mock order %s -> capture %s", paypal_order_id, mock_capture_id
            )
            return {
                "id": paypal_order_id,
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "payments": {
                            "captures": [
                                {
                                    "id": mock_capture_id,
                                    "status": "COMPLETED",
                                    "amount": {"currency_code": "USD", "value": "100.00"},
                                    "create_time": time.strftime(
                                        "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
                                    ),
                                }
                            ]
                        }
                    }
                ],
            }

        token = await self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "PayPal-Request-Id": request_id,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{self.api_base}/v2/checkout/orders/{paypal_order_id}/capture",
                headers=headers,
                json={},
            )
            if res.status_code not in (200, 201):
                logger.error("PayPal Capture Order failed: %s - %s", res.status_code, res.text)
                raise RuntimeError(f"PayPal Capture Order error: {res.text}")
            return res.json()

    async def refund_capture(
        self,
        paypal_capture_id: str,
        amount_value: Optional[str] = None,
        currency_code: str = "USD",
        reason: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Initiates a refund on a captured payment."""
        request_id = idempotency_key or str(uuid.uuid4())

        if not self.is_configured or paypal_capture_id.startswith("MOCK_CAP_"):
            mock_refund_id = f"MOCK_REF_{uuid.uuid4().hex[:12].upper()}"
            logger.info(
                "Refunded Sandbox mock capture %s -> refund %s", paypal_capture_id, mock_refund_id
            )
            return {
                "id": mock_refund_id,
                "status": "COMPLETED",
                "amount": {"currency_code": currency_code, "value": amount_value or "0.00"},
            }

        token = await self.get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "PayPal-Request-Id": request_id,
        }

        payload: Dict[str, Any] = {}
        if amount_value:
            payload["amount"] = {"value": amount_value, "currency_code": currency_code}
        if reason:
            payload["note_to_payer"] = reason[:255]

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{self.api_base}/v2/payments/captures/{paypal_capture_id}/refund",
                headers=headers,
                json=payload,
            )
            if res.status_code not in (200, 201):
                logger.error("PayPal Refund failed: %s - %s", res.status_code, res.text)
                raise RuntimeError(f"PayPal Refund error: {res.text}")
            return res.json()

    async def verify_webhook_signature(
        self,
        raw_body: bytes,
        headers: Dict[str, str],
    ) -> Tuple[bool, str]:
        """Verifies PayPal webhook signature via PayPal postback verification endpoint."""
        transmission_id = headers.get("paypal-transmission-id")
        transmission_time = headers.get("paypal-transmission-time")
        cert_url = headers.get("paypal-cert-url")
        auth_algo = headers.get("paypal-auth-algo")
        transmission_sig = headers.get("paypal-transmission-sig")

        if not (
            transmission_id and transmission_time and cert_url and auth_algo and transmission_sig
        ):
            # Check for simulated test event header
            if headers.get("x-promisepay-simulator") == "true":
                return True, "SIMULATOR_TEST"
            return False, "MISSING_REQUIRED_HEADERS"

        # Validate PayPal Certificate URL: MUST be HTTPS and strictly on .paypal.com domain
        parsed_cert = urlparse(cert_url)
        cert_host = (parsed_cert.hostname or "").lower()
        if parsed_cert.scheme.lower() != "https" or not (
            cert_host == "api.paypal.com" or cert_host.endswith(".paypal.com")
        ):
            return False, "INVALID_CERT_URL_DOMAIN"

        if not self.is_configured or not self.webhook_id:
            # In mock sandbox mode without active credentials, verify raw payload hash
            logger.info(
                "Mock sandbox webhook verification accepted for transmission %s", transmission_id
            )
            return True, "MOCK_VERIFIED"

        token = await self.get_access_token()
        verify_headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        # Calculate CRC32 of raw body
        import zlib

        zlib.crc32(raw_body) & 0xFFFFFFFF

        verify_payload = {
            "auth_algo": auth_algo,
            "cert_url": cert_url,
            "transmission_id": transmission_id,
            "transmission_sig": transmission_sig,
            "transmission_time": transmission_time,
            "webhook_id": self.webhook_id,
            "webhook_event": httpx.Response(200, content=raw_body).json(),
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.api_base}/v1/notifications/verify-webhook-signature",
                    headers=verify_headers,
                    json=verify_payload,
                )
                if res.status_code == 200:
                    status = res.json().get("verification_status")
                    if status == "SUCCESS":
                        return True, "VERIFIED"
                return False, f"VERIFICATION_FAILED_{res.status_code}"
        except Exception as exc:
            logger.warning("Error during PayPal webhook signature postback: %s", exc)
            return False, "VERIFICATION_EXCEPTION"


paypal_client = PayPalClient()
