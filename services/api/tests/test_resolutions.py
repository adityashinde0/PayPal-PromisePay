"""Unit and integration tests for Resolution Cases, Human-Gated Review & PayPal Sandbox Refunds (Phase 5)."""


def test_open_resolution_case_success(client):
    """Test opening a resolution case updates case store, promise resolution state, and audit trail."""
    payload = {
        "reason": "Buyer noticed responsive layout breaks on iPad Mini viewport.",
        "requestedOutcome": "REVIEW",
        "submitter": "alice.buyer@example.com",
        "role": "BUYER",
    }
    res = client.post("/api/promises/PP-DEMO1-2026/resolution-cases", json=payload)
    assert res.status_code == 201
    case = res.json()

    assert case["caseId"].startswith("case_")
    assert case["promiseId"] == "PP-DEMO1-2026"
    assert case["status"] == "OPEN"
    assert case["submitter"] == "alice.buyer@example.com"
    assert len(case["timeline"]) == 1
    assert case["timeline"][0]["action"] == "CASE_OPENED"

    # Verify promise resolution projection updated
    p_res = client.get("/api/promises/PP-DEMO1-2026")
    assert p_res.status_code == 200
    p_data = p_res.json()
    assert p_data["resolution"]["caseId"] == case["caseId"]
    assert p_data["resolution"]["status"] == "OPEN"
    assert p_data["status"] == "REVIEW_REQUIRED"
    assert any(t["eventType"] == "RESOLUTION_CASE_OPENED" for t in p_data["timeline"])


def test_record_decision_justification_enforcement(client):
    """Test recording reviewer decision enforces mandatory human reason notes."""
    # Open case
    open_res = client.post(
        "/api/promises/PP-DEMO1-2026/resolution-cases",
        json={
            "reason": "Dispute regarding checkout button contrast and flow.",
            "requestedOutcome": "REFUND",
        },
    )
    case_id = open_res.json()["caseId"]

    # Fails if reason is too short or empty
    bad_res = client.post(
        f"/api/resolution-cases/{case_id}/decisions",
        json={"decision": "RECOMMEND_REFUND", "reason": "bad"},
    )
    assert bad_res.status_code == 422 or bad_res.status_code == 400

    # Valid human-justified decision
    valid_res = client.post(
        f"/api/resolution-cases/{case_id}/decisions",
        json={
            "decision": "RECOMMEND_REFUND",
            "reason": "Merchant failed to deliver checkout functional audit within agreed SLA; full refund recommended.",
            "reviewer": "auditor@promisepay.example",
        },
    )
    assert valid_res.status_code == 200
    updated_case = valid_res.json()
    assert updated_case["status"] == "DECISION_RECORDED"
    assert updated_case["decision"] == "RECOMMEND_REFUND"
    assert "SLA" in updated_case["decisionReason"]
    assert updated_case["decisionBy"] == "auditor@promisepay.example"


def test_refund_precondition_human_gate_and_idempotency(client):
    """Test refund endpoint strictly enforces human gate, idempotency header, and captured payment check."""
    # Create promise that is NOT captured
    p_res = client.post(
        "/api/promises",
        json={
            "title": "Unpaid Design Agreement",
            "category": "digital_project",
            "amount": {"currencyCode": "USD", "value": "150.00"},
            "promiseText": "UI Design mockup delivery in Figma.",
        },
    )
    unpaid_id = p_res.json()["promiseId"]

    # Open case on unpaid promise
    case_res = client.post(
        f"/api/promises/{unpaid_id}/resolution-cases",
        json={"reason": "Customer changed mind before funding."},
    )
    unpaid_case_id = case_res.json()["caseId"]

    # 1. Missing Idempotency-Key header fails
    fail_no_idemp = client.post(
        f"/api/resolution-cases/{unpaid_case_id}/refunds",
        json={"reason": "Test refund"},
    )
    assert fail_no_idemp.status_code == 400
    assert "Idempotency-Key" in fail_no_idemp.json()["detail"]

    # 2. Human gate: decision not yet RECOMMEND_REFUND
    fail_gate = client.post(
        f"/api/resolution-cases/{unpaid_case_id}/refunds",
        headers={"Idempotency-Key": "key_1"},
        json={"reason": "Attempting refund before reviewer sign-off."},
    )
    assert fail_gate.status_code == 400
    assert "Refund gate violation" in fail_gate.json()["detail"]

    # Record decision as OPEN_REVIEW (not refund)
    client.post(
        f"/api/resolution-cases/{unpaid_case_id}/decisions",
        json={"decision": "OPEN_REVIEW", "reason": "Investigating logs further."},
    )
    fail_wrong_decision = client.post(
        f"/api/resolution-cases/{unpaid_case_id}/refunds",
        headers={"Idempotency-Key": "key_2"},
        json={"reason": "Attempting refund with wrong decision."},
    )
    assert fail_wrong_decision.status_code == 400
    assert "Refund gate violation" in fail_wrong_decision.json()["detail"]

    # Now record RECOMMEND_REFUND decision
    client.post(
        f"/api/resolution-cases/{unpaid_case_id}/decisions",
        json={"decision": "RECOMMEND_REFUND", "reason": "Confirmed refund recommendation."},
    )

    # 3. Payment state check: Uncaptured payment fails refund
    fail_uncaptured = client.post(
        f"/api/resolution-cases/{unpaid_case_id}/refunds",
        headers={"Idempotency-Key": "key_3"},
        json={"reason": "Attempting refund on uncaptured promise."},
    )
    assert fail_uncaptured.status_code == 400
    assert "not CAPTURED" in fail_uncaptured.json()["detail"]


def test_successful_sandbox_refund_flow_and_idempotency(client):
    """Test end-to-end captured promise refund execution and idempotent retry."""
    # PP-DEMO1-2026 is already captured in seed data ($450.00 USD)
    case_res = client.post(
        "/api/promises/PP-DEMO1-2026/resolution-cases",
        json={"reason": "Buyer requested cancellation due to missing cart demonstration."},
    )
    case_id = case_res.json()["caseId"]

    # Record RECOMMEND_REFUND
    client.post(
        f"/api/resolution-cases/{case_id}/decisions",
        json={
            "decision": "RECOMMEND_REFUND",
            "reason": "Merchant agreed to full Sandbox refund due to non-fulfillment.",
        },
    )

    idemp_key = "idemp_test_sandbox_refund_001"
    refund_res = client.post(
        f"/api/resolution-cases/{case_id}/refunds",
        headers={"Idempotency-Key": idemp_key},
        json={"reason": "Customer agreed outcome refund."},
    )
    assert refund_res.status_code == 200
    refund_data = refund_res.json()

    assert refund_data["caseId"] == case_id
    assert refund_data["promiseId"] == "PP-DEMO1-2026"
    assert refund_data["status"] == "COMPLETED"
    assert refund_data["amount"] == "450.00"
    assert "paypalRefundId" in refund_data
    assert refund_data["idempotencyKey"] == idemp_key

    # Check promise state transitioned to REFUNDED and RESOLVED
    p_data = client.get("/api/promises/PP-DEMO1-2026").json()
    assert p_data["payment"]["state"] == "REFUNDED"
    assert p_data["status"] == "RESOLVED"
    assert p_data["resolution"]["status"] == "RESOLVED_REFUNDED"
    assert any(t["eventType"] == "PAYPAL_REFUND_EXECUTED" for t in p_data["timeline"])

    # Idempotent retry with same key returns identical result
    retry_res = client.post(
        f"/api/resolution-cases/{case_id}/refunds",
        headers={"Idempotency-Key": idemp_key},
        json={"reason": "Customer agreed outcome refund."},
    )
    assert retry_res.status_code == 200
    assert retry_res.json()["paypalRefundId"] == refund_data["paypalRefundId"]

    # New idempotency key on already refunded case rejected
    second_res = client.post(
        f"/api/resolution-cases/{case_id}/refunds",
        headers={"Idempotency-Key": "idemp_test_sandbox_refund_002"},
        json={"reason": "Second refund attempt."},
    )
    assert second_res.status_code == 400
    assert "already been refunded" in second_res.json()["detail"]


def test_record_decision_mark_complete(client):
    """Test that reviewer decision MARK_COMPLETE marks case and promise as COMPLETE."""
    case_res = client.post(
        "/api/promises/PP-DEMO1-2026/resolution-cases",
        json={"reason": "Adjudicating final deliverables."},
    )
    case_id = case_res.json()["caseId"]

    decision_res = client.post(
        f"/api/resolution-cases/{case_id}/decisions",
        json={
            "decision": "MARK_COMPLETE",
            "reason": "All submitted code and artifacts verified manually by lead auditor.",
        },
    )
    assert decision_res.status_code == 200
    case_data = decision_res.json()
    assert case_data["status"] == "RESOLVED_COMPLETE"

    p_data = client.get("/api/promises/PP-DEMO1-2026").json()
    assert p_data["status"] == "COMPLETE"
    assert p_data["resolution"]["decision"] == "MARK_COMPLETE"


def test_resolution_list_and_get_boundaries(client):
    """Test retrieving case by ID and listing cases with 404 boundaries."""
    list_res = client.get("/api/promises/PP-DEMO1-2026/resolution-cases")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["promiseId"] == "PP-DEMO1-2026"
    assert list_data["total"] >= 1

    case_id = list_data["items"][0]["caseId"]
    get_res = client.get(f"/api/resolution-cases/{case_id}")
    assert get_res.status_code == 200
    assert get_res.json()["caseId"] == case_id

    # 404 checks
    assert client.get("/api/promises/PP-UNKNOWN/resolution-cases").status_code == 404
    assert client.get("/api/resolution-cases/case_nonexistent").status_code == 404
