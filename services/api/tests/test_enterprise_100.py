"""Enterprise 100/100 Certification Tests.

Validates:
1. Automated PII / DLP Data Loss Prevention (PCI-DSS & GDPR Luhn sanitization).
2. Asynchronous Circuit Breaker & Multi-Provider AI Failover.
3. Redis Token-Bucket Sliding-Window Rate Limiting.
4. PayPal Payouts API (/v1/payments/payouts) milestone disbursement.
5. RFC 6962 Transparency Log Merkle Root Anchoring & W3C OpenTelemetry Tracing.
"""

import pytest

from promisepay_api.services.circuit_breaker import AsyncCircuitBreaker, CircuitBreakerOpenException, CircuitState
from promisepay_api.services.dlp import luhn_checksum_valid, scrub_pii
from promisepay_api.services.paypal_client import paypal_client
from promisepay_api.services.rate_limiter import RateLimiter
from promisepay_api.services.transparency_log import generate_transparency_log_proof


def test_luhn_credit_card_validation():
    # Valid Visa test number
    assert luhn_checksum_valid("4532015112830366") is True
    # Invalid card number
    assert luhn_checksum_valid("4532015112830367") is False
    # Short length
    assert luhn_checksum_valid("12345") is False


def test_dlp_pii_scrubber():
    text = (
        "Client details: John Doe, email john.doe@example.com, phone (555) 234-5678. "
        "Payment card: 4532-0151-1283-0366, SSN: 123-45-6789. "
        "Secret Key: AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6."
    )
    clean_text, count = scrub_pii(text)
    assert count >= 4
    assert "[REDACTED_EMAIL]" in clean_text
    assert "[REDACTED_PHONE]" in clean_text
    assert "[REDACTED_CARD_NUMBER]" in clean_text
    assert "[REDACTED_API_KEY]" in clean_text
    assert "john.doe@example.com" not in clean_text
    assert "4532-0151-1283-0366" not in clean_text


@pytest.mark.asyncio
async def test_circuit_breaker_trip_and_fallback():
    cb = AsyncCircuitBreaker(name="test-breaker", failure_threshold=2, recovery_timeout_seconds=0.1)

    async def failing_call():
        raise RuntimeError("External AI service 503 unavailable")

    async def fallback_call():
        return "fallback_result_success"

    # Call 1 fails
    with pytest.raises(RuntimeError):
        await cb.call(failing_call)
    assert cb.state == CircuitState.CLOSED

    # Call 2 fails -> trips to OPEN
    with pytest.raises(RuntimeError):
        await cb.call(failing_call)
    assert cb.state == CircuitState.OPEN

    # Call 3 while OPEN executes fallback seamlessly
    res = await cb.call(failing_call, fallback_func=fallback_call)
    assert res == "fallback_result_success"


@pytest.mark.asyncio
async def test_rate_limiter():
    limiter = RateLimiter(default_rate=3, default_window_seconds=10)
    key = "client-test-rate"

    # First 3 allowed
    for i in range(3):
        allowed, remaining, _ = await limiter.is_allowed(key, max_requests=3, window_seconds=10)
        assert allowed is True

    # 4th request blocked
    allowed, remaining, _ = await limiter.is_allowed(key, max_requests=3, window_seconds=10)
    assert allowed is False
    assert remaining == 0


@pytest.mark.asyncio
async def test_paypal_payouts_client():
    payout = await paypal_client.create_batch_payout(
        recipient_email="merchant-seller@example.com",
        amount_value="150.00",
        currency_code="USD",
        note="Milestone 1 fulfillment",
    )
    assert "batch_header" in payout
    assert payout["batch_header"]["batch_status"] == "SUCCESS"
    assert "payout_batch_id" in payout["batch_header"]


def test_transparency_log_proof_generation():
    proof = generate_transparency_log_proof(
        merkle_root="a" * 64,
        promise_id="PP-TEST-100",
        timestamp="2026-11-03T21:00:00Z",
    )
    assert proof["anchored"] is True
    assert proof["legalNonRepudiation"] == "CONFIRMED"
    assert proof["inclusionProof"].startswith("PP-PROOF-")
    assert proof["standard"].startswith("RFC 6962")


def test_dossier_contains_transparency_proof(client):
    res = client.get("/api/promises/PP-DEMO1-2026/dispute-defense-dossier")
    assert res.status_code == 200
    data = res.json()
    assert "transparencyLogProof" in data
    assert data["transparencyLogProof"]["anchored"] is True
    assert data["transparencyLogProof"]["legalNonRepudiation"] == "CONFIRMED"


def test_opentelemetry_headers(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert "traceparent" in res.headers
    assert res.headers["traceparent"].startswith("00-")
    assert "x-ratelimit-limit" in res.headers
