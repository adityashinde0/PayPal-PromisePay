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
