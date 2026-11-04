"""Unit tests for Promise Core (Phase 1)."""

import re


def test_list_promises(client):
    """Test GET /api/promises retrieves seeded promises."""
    response = client.get("/api/promises")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 3
    # Verify PP-DEMO1-2026 is present
    ids = [item["promiseId"] for item in data["items"]]
    assert "PP-DEMO1-2026" in ids


def test_get_category_templates(client):
    """Test GET /api/promises/templates/{category} returns requirements."""
    response = client.get("/api/promises/templates/digital_project")
    assert response.status_code == 200
    reqs = response.json()
    assert len(reqs) >= 2
    assert any("UI" in r["title"] or "Interface" in r["title"] for r in reqs)


def test_create_promise_success(client):
    """Test POST /api/promises creates a draft promise and extracts requirements."""
    payload = {
        "category": "digital_project",
        "title": "Fullstack SaaS Dashboard",
        "promiseText": "Build a responsive Next.js frontend with user authentication and deployed to Vercel.",
        "amount": {"currencyCode": "USD", "value": "750.00"},
        "merchantOrderRef": "ORD-9999",
    }
    response = client.post("/api/promises", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert "promiseId" in data
    assert re.match(r"^PP-[A-Z0-9]{4,12}-\d{4}$", data["promiseId"])
    assert data["title"] == "Fullstack SaaS Dashboard"
    assert data["status"] == "DRAFT"
    assert data["amount"]["value"] == "750.00"
    assert len(data["requirements"]) >= 2
    assert data["currentVersion"] == 1
    assert len(data["timeline"]) >= 1


def test_create_promise_validation_failure(client):
    """Test input validation rejects invalid amounts."""
    # Negative amount
    payload = {
        "category": "digital_project",
        "title": "Invalid Amount Test",
        "promiseText": "Test text long enough for validation.",
        "amount": {"currencyCode": "USD", "value": "-50.00"},
    }
    response = client.post("/api/promises", json=payload)
    assert response.status_code == 422

    # Invalid currency code
    payload["amount"] = {"currencyCode": "INVALID", "value": "100.00"}
    response = client.post("/api/promises", json=payload)
    assert response.status_code == 422


def test_promise_lifecycle_edit_and_confirm(client):
    """Test editing requirements and merchant confirmation moving DRAFT -> READY_FOR_PAYMENT."""
    # 1. Create Draft
    create_res = client.post(
        "/api/promises",
        json={
            "category": "professional_document",
            "title": "AI Safety Architecture Plan",
            "promiseText": "Write a 20-page architecture document covering threat modeling and verification.",
            "amount": {"currencyCode": "USD", "value": "350.00"},
        },
    )
    assert create_res.status_code == 201
    p_id = create_res.json()["promiseId"]
    assert create_res.json()["status"] == "DRAFT"

    # 2. Patch / Edit Requirements
    patch_res = client.patch(
        f"/api/promises/{p_id}",
        json={
            "title": "AI Safety Architecture Plan (Updated)",
            "requirements": [
                {
                    "id": "req_custom_1",
                    "key": "REQ-1",
                    "title": "Executive Summary & Trust Boundaries",
                    "description": "Clear delineation of all untrusted inputs.",
                    "priority": 1,
                    "verificationMethod": "DOCUMENT_STRUCTURE_ANALYSIS",
                }
            ],
        },
    )
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    assert patched_data["title"] == "AI Safety Architecture Plan (Updated)"
    assert patched_data["currentVersion"] == 2
    assert len(patched_data["requirements"]) == 1

    # 3. Explicit Merchant Confirmation
    confirm_res = client.post(f"/api/promises/{p_id}/confirm")
    assert confirm_res.status_code == 200
    confirmed_data = confirm_res.json()
    assert confirmed_data["status"] == "READY_FOR_PAYMENT"

    # 4. Attempting to confirm again should return 400
    repeat_res = client.post(f"/api/promises/{p_id}/confirm")
    assert repeat_res.status_code == 400


def test_get_nonexistent_promise(client):
    """Test 404 on nonexistent promise ID."""
    response = client.get("/api/promises/PP-NONEXISTENT-9999")
    assert response.status_code == 404
