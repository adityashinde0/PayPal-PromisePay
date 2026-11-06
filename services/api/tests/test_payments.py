"""Unit tests for PayPal Sandbox Payment Core & Webhooks (Phase 2)."""


def test_payment_precondition_check(client):
    """Test payment order creation requires READY_FOR_PAYMENT status."""
    # PP-DEMO3-2026 is in DRAFT status
    res = client.post("/api/promises/PP-DEMO3-2026/payment-orders")
    assert res.status_code == 400
    assert "READY_FOR_PAYMENT" in res.json()["detail"]


def test_payment_order_create_and_capture_lifecycle(client):
    """Test full create order -> capture lifecycle on READY_FOR_PAYMENT promise."""
    # PP-DEMO2-2026 is in READY_FOR_PAYMENT status
    create_res = client.post(
        "/api/promises/PP-DEMO2-2026/payment-orders",
        headers={"Idempotency-Key": "test-idem-order-1"},
    )
    assert create_res.status_code == 201
    order_data = create_res.json()
    assert "paypalOrderId" in order_data
    order_id = order_data["paypalOrderId"]
    assert order_data["status"] == "ORDER_CREATED"

    # Capture the created order
    capture_res = client.post(
        f"/api/promises/PP-DEMO2-2026/payment-orders/{order_id}/capture",
        headers={"Idempotency-Key": "test-idem-capture-1"},
    )
    assert capture_res.status_code == 200
    capture_data = capture_res.json()
    assert capture_data["status"] == "CAPTURED"
    assert "paypalCaptureId" in capture_data

    # Check updated promise graph projection
    promise_res = client.get("/api/promises/PP-DEMO2-2026")
    assert promise_res.status_code == 200
    p = promise_res.json()
    assert p["status"] == "PAID"
    assert p["payment"]["state"] == "CAPTURED"
    assert p["payment"]["paypalOrderId"] == order_id

    # Test Idempotent repeated capture
    repeat_res = client.post(f"/api/promises/PP-DEMO2-2026/payment-orders/{order_id}/capture")
    assert repeat_res.status_code == 200
    assert repeat_res.json()["status"] == "CAPTURED"


def test_payment_capture_mismatched_order(client):
    """Test capture rejection when order ID does not match promise order."""
    res = client.post("/api/promises/PP-DEMO1-2026/payment-orders/WRONG_ORDER_ID_999/capture")
    assert res.status_code == 400


def test_webhook_invalid_signature_rejection(client):
    """Test webhook rejects payloads with missing or invalid signature headers."""
    payload = {"id": "WH-TEST-EVT-1", "event_type": "CHECKOUT.ORDER.APPROVED"}
    res = client.post("/api/webhooks/paypal", json=payload)
    assert res.status_code == 400
    assert "Invalid webhook signature" in res.json()["detail"]


def test_webhook_event_processing_and_deduplication(client):
    """Test valid webhook receipt, state reconciliation, and idempotent deduplication."""
    event_id = "WH-TEST-CAPTURE-EVT-999"
    webhook_headers = {
        "x-promisepay-simulator": "true",
        "paypal-transmission-id": "trans-999",
        "paypal-transmission-time": "2026-11-02T12:00:00Z",
        "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "mock_sig_123",
    }
    payload = {
        "id": event_id,
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {
            "id": "CAP-WEBHOOK-12345",
            "custom_id": "PP-DEMO1-2026",
            "status": "COMPLETED",
        },
    }

    # First delivery
    res = client.post("/api/webhooks/paypal", headers=webhook_headers, json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "processed"
    assert data["eventId"] == event_id

    # Duplicate delivery
    res_dup = client.post("/api/webhooks/paypal", headers=webhook_headers, json=payload)
    assert res_dup.status_code == 200
    assert res_dup.json()["status"] == "already_processed"


def test_mock_fallback_disallowed_outside_demo_or_test_mode(client, monkeypatch):
    """Test that mock order fallback fails loudly with clear error outside demo or test mode."""
    from promisepay_api.config import settings
    from promisepay_api.services.paypal_client import paypal_client

    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "paypal_demo_mode", False)
    monkeypatch.setattr(paypal_client, "client_id", "")
    monkeypatch.setattr(paypal_client, "client_secret", "")

    res = client.post("/api/promises/PP-DEMO2-2026/payment-orders")
    assert res.status_code == 502
    assert "PAYPAL_DEMO_MODE is disabled" in res.json()["detail"]


def test_sandbox_capture_failure_returns_error_not_mock_cap(client, monkeypatch):
    """Test that genuine sandbox capture failure returns clear API error instead of fake MOCK_CAP."""
    import httpx
    from promisepay_api.config import settings
    from promisepay_api.services.paypal_client import paypal_client
    from promisepay_api.services.promise_store import promise_store

    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "paypal_demo_mode", False)
    monkeypatch.setattr(paypal_client, "client_id", "test_client_id")
    monkeypatch.setattr(paypal_client, "client_secret", "test_client_secret")

    async def mock_get_token():
        return "sandbox_valid_test_token"

    monkeypatch.setattr(paypal_client, "get_access_token", mock_get_token)

    class MockCaptureErrorResponse:
        status_code = 422
        text = '{"name":"UNPROCESSABLE_ENTITY","message":"The requested action could not be performed"}'

        def json(self):
            return {"name": "UNPROCESSABLE_ENTITY", "message": "The requested action could not be performed"}

    async def mock_post(*args, **kwargs):
        return MockCaptureErrorResponse()

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    p = promise_store.get("PP-DEMO2-2026")
    p.payment.paypalOrderId = "REAL_SANDBOX_ORD_12345"
    p.payment.state = "ORDER_CREATED"

    res = client.post("/api/promises/PP-DEMO2-2026/payment-orders/REAL_SANDBOX_ORD_12345/capture")
    assert res.status_code == 502
    assert "PayPal capture failed" in res.json()["detail"]
    assert "MOCK_CAP_" not in res.text

    # Verify promise is NOT marked as PAID
    updated = promise_store.get("PP-DEMO2-2026")
    assert updated.status != "PAID"
    assert updated.payment.state != "CAPTURED"


def test_mock_fallback_allowed_when_demo_mode_enabled(client, monkeypatch):
    """Test that mock order and capture fallbacks are allowed when PAYPAL_DEMO_MODE is true."""
    from promisepay_api.config import settings
    from promisepay_api.services.paypal_client import paypal_client

    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "paypal_demo_mode", True)
    monkeypatch.setattr(paypal_client, "client_id", "")
    monkeypatch.setattr(paypal_client, "client_secret", "")

    create_res = client.post("/api/promises/PP-DEMO2-2026/payment-orders")
    assert create_res.status_code == 201
    order_id = create_res.json()["paypalOrderId"]
    assert order_id.startswith("MOCK_ORD_")

    capture_res = client.post(f"/api/promises/PP-DEMO2-2026/payment-orders/{order_id}/capture")
    assert capture_res.status_code == 200
    capture_id = capture_res.json()["paypalCaptureId"]
    assert capture_id.startswith("MOCK_CAP_")


def test_real_capture_provenance_state_is_recorded(client, monkeypatch):
    """Test that real PayPal Sandbox capture properly records all provenance fields."""
    import httpx
    from promisepay_api.config import settings
    from promisepay_api.services.paypal_client import paypal_client
    from promisepay_api.services.promise_store import promise_store

    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "paypal_demo_mode", False)
    monkeypatch.setattr(paypal_client, "client_id", "test_client_id")
    monkeypatch.setattr(paypal_client, "client_secret", "test_client_secret")

    async def mock_get_token():
        return "sandbox_valid_test_token"

    monkeypatch.setattr(paypal_client, "get_access_token", mock_get_token)

    class MockCaptureSuccessResponse:
        status_code = 201

        def json(self):
            return {
                "id": "REAL_SANDBOX_ORD_77777",
                "status": "COMPLETED",
                "purchase_units": [
                    {
                        "payments": {
                            "captures": [
                                {
                                    "id": "REAL_SANDBOX_CAP_88888",
                                    "status": "COMPLETED",
                                    "amount": {"currency_code": "USD", "value": "250.00"},
                                    "create_time": "2026-11-05T12:00:00Z",
                                }
                            ]
                        }
                    }
                ],
            }

    async def mock_post(*args, **kwargs):
        return MockCaptureSuccessResponse()

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    p = promise_store.get("PP-DEMO2-2026")
    p.payment.paypalOrderId = "REAL_SANDBOX_ORD_77777"
    p.payment.state = "ORDER_CREATED"

    res = client.post("/api/promises/PP-DEMO2-2026/payment-orders/REAL_SANDBOX_ORD_77777/capture")
    assert res.status_code == 200
    data = res.json()
    assert data["paypalCaptureId"] == "REAL_SANDBOX_CAP_88888"
    assert data["paymentMode"] == "Real PayPal Sandbox"

    # Verify graph response provenance
    graph_res = client.get("/api/promises/PP-DEMO2-2026")
    assert graph_res.status_code == 200
    payment = graph_res.json()["payment"]
    assert payment["buyerApproved"] is True
    assert payment["capturedAt"] is not None
    assert payment["paymentMode"] == "Real PayPal Sandbox"
    assert payment["paypalCaptureId"] == "REAL_SANDBOX_CAP_88888"


def test_demo_mode_is_visibly_simulated_mode(client, monkeypatch):
    """Test that payments created in demo mode are explicitly labeled Simulated Demo Mode."""
    from promisepay_api.config import settings
    from promisepay_api.services.paypal_client import paypal_client

    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "paypal_demo_mode", True)
    monkeypatch.setattr(paypal_client, "client_id", "")
    monkeypatch.setattr(paypal_client, "client_secret", "")

    create_res = client.post("/api/promises/PP-DEMO2-2026/payment-orders")
    assert create_res.status_code == 201
    order_id = create_res.json()["paypalOrderId"]
    assert order_id.startswith("MOCK_ORD_")
    assert create_res.json()["paymentMode"] == "Simulated Demo Mode"

    capture_res = client.post(f"/api/promises/PP-DEMO2-2026/payment-orders/{order_id}/capture")
    assert capture_res.status_code == 200
    assert capture_res.json()["paymentMode"] == "Simulated Demo Mode"

    graph_res = client.get("/api/promises/PP-DEMO2-2026")
    assert graph_res.json()["payment"]["paymentMode"] == "Simulated Demo Mode"


def test_normal_sandbox_capture_failure_records_failed_provenance(client, monkeypatch):
    """Test that capture failure transitions payment to 'Payment Failed' mode with failure reason."""
    import httpx
    from promisepay_api.config import settings
    from promisepay_api.services.paypal_client import paypal_client
    from promisepay_api.services.promise_store import promise_store

    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "paypal_demo_mode", False)
    monkeypatch.setattr(paypal_client, "client_id", "test_client_id")
    monkeypatch.setattr(paypal_client, "client_secret", "test_client_secret")

    async def mock_get_token():
        return "sandbox_valid_test_token"

    monkeypatch.setattr(paypal_client, "get_access_token", mock_get_token)

    class MockCaptureErrorResponse:
        status_code = 422
        text = '{"name":"INSTRUMENT_DECLINED","message":"The instrument was declined"}'

        def json(self):
            return {"name": "INSTRUMENT_DECLINED", "message": "The instrument was declined"}

    async def mock_post(*args, **kwargs):
        return MockCaptureErrorResponse()

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    p = promise_store.get("PP-DEMO2-2026")
    p.payment.paypalOrderId = "REAL_FAIL_ORD_123"
    p.payment.state = "ORDER_CREATED"

    res = client.post("/api/promises/PP-DEMO2-2026/payment-orders/REAL_FAIL_ORD_123/capture")
    assert res.status_code == 502

    graph_res = client.get("/api/promises/PP-DEMO2-2026")
    payment = graph_res.json()["payment"]
    assert payment["state"] == "FAILED"
    assert payment["paymentMode"] == "Payment Failed"
    assert payment["failureReason"] is not None


def test_unverified_webhook_cannot_be_shown_as_verified(client):
    """Test that invalid signature causes webhook rejection and prevents verified flag."""
    payload = {
        "id": "WH-UNVERIFIED-1",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource": {"id": "CAP-UNVERIFIED", "custom_id": "PP-DEMO1-2026"},
    }
    # Send without any signature headers
    res = client.post("/api/webhooks/paypal", json=payload)
    assert res.status_code == 400

    graph_res = client.get("/api/promises/PP-DEMO1-2026")
    payment = graph_res.json()["payment"]
    assert payment["webhookVerified"] is False
    assert payment["webhookStatus"] != "VERIFIED"


def test_verified_webhook_records_signature_verification_and_timeline(client):
    """Test that a verified webhook sets webhookVerified=True and logs timeline event."""
    event_id = "WH-VERIFIED-EVENT-555"
    headers = {
        "x-promisepay-simulator": "true",
        "paypal-transmission-id": "trans-555",
        "paypal-transmission-time": "2026-11-05T12:00:00Z",
        "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "valid_sig_555",
    }
    payload = {
        "id": event_id,
        "event_type": "CHECKOUT.ORDER.APPROVED",
        "resource": {
            "id": "ORD-WEBHOOK-555",
            "custom_id": "PP-DEMO2-2026",
            "status": "APPROVED",
        },
    }

    res = client.post("/api/webhooks/paypal", headers=headers, json=payload)
    assert res.status_code == 200

    graph_res = client.get("/api/promises/PP-DEMO2-2026")
    p = graph_res.json()
    assert p["payment"]["webhookVerified"] is True
    assert p["payment"]["webhookStatus"] == "VERIFIED"
    assert p["payment"]["buyerApproved"] is True

    # Verify timeline entry for webhook signature
    timeline_event_types = [e["eventType"] for e in p["timeline"]]
    assert "WEBHOOK_SIGNATURE_VERIFIED" in timeline_event_types
