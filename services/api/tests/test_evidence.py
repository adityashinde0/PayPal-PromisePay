"""Unit and integration tests for Evidence Management and Provenance (Phase 3)."""

import io


def test_get_seeded_evidence(client):
    """Test GET /api/promises/PP-DEMO1-2026/evidence returns seeded items with provenance."""
    response = client.get("/api/promises/PP-DEMO1-2026/evidence")
    assert response.status_code == 200
    data = response.json()

    assert data["promiseId"] == "PP-DEMO1-2026"
    assert data["total"] >= 2
    assert len(data["items"]) >= 2

    # Check live url item
    live_items = [i for i in data["items"] if i["kind"] == "live_url"]
    assert len(live_items) >= 1
    item = live_items[0]
    assert "demo-storefront" in item["canonicalUri"]
    assert item["status"] == "SCAN_CLEAN"
    assert len(item["sha256"]) == 64
    assert item["provenance"]["isClaimOnly"] is True
    assert item["provenance"]["scannerStatus"] == "SCAN_CLEAN"


def test_create_upload_intent_success(client):
    """Test POST /api/promises/{id}/evidence/upload-intents generates signed upload info."""
    payload = {
        "fileName": "checkout-proof.png",
        "mimeType": "image/png",
        "sizeBytes": 1024 * 1024,  # 1MB
        "requirementIds": ["req_demo1_ui"],
    }
    response = client.post("/api/promises/PP-DEMO1-2026/evidence/upload-intents", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert "evidenceId" in data
    assert data["evidenceId"].startswith("ev_")
    assert "uploadUrl" in data
    assert "storageKey" in data
    assert "checkout-proof.png" in data["storageKey"]
    assert "expiresAt" in data


def test_create_upload_intent_validation_failure(client):
    """Test upload intent rejects forbidden mime types and oversized files."""
    # Forbidden mime type
    payload = {
        "fileName": "malware.exe",
        "mimeType": "application/x-msdownload",
        "sizeBytes": 1024,
        "requirementIds": ["req_demo1_ui"],
    }
    response = client.post("/api/promises/PP-DEMO1-2026/evidence/upload-intents", json=payload)
    assert response.status_code == 400
    assert "MIME type" in response.json()["detail"]

    # Invalid requirement ID
    payload_invalid_req = {
        "fileName": "screenshot.png",
        "mimeType": "image/png",
        "sizeBytes": 1024,
        "requirementIds": ["non_existent_req_id"],
    }
    response = client.post(
        "/api/promises/PP-DEMO1-2026/evidence/upload-intents", json=payload_invalid_req
    )
    assert response.status_code == 400
    assert "Requirement ID" in response.json()["detail"]


def test_register_live_url_evidence(client):
    """Test POST /api/promises/{id}/evidence registers valid live URL and calculates SHA-256."""
    payload = {
        "kind": "live_url",
        "source": "https://production-app.example.com/storefront",
        "requirementIds": ["req_demo1_ui", "req_demo1_flow"],
        "submitterClaim": "The live production deployment includes cart and checkout functionality.",
    }
    response = client.post("/api/promises/PP-DEMO1-2026/evidence", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["kind"] == "live_url"
    assert data["canonicalUri"] == "https://production-app.example.com/storefront"
    assert len(data["sha256"]) == 64
    assert data["provenance"]["sourceHost"] == "production-app.example.com"
    assert data["provenance"]["isClaimOnly"] is True

    # Check promise graph timeline updated
    graph_res = client.get("/api/promises/PP-DEMO1-2026")
    assert graph_res.status_code == 200
    timeline = graph_res.json()["timeline"]
    assert any(t["eventType"] == "EVIDENCE_SUBMITTED" for t in timeline)


def test_ssrf_protection_guards(client):
    """Test SSRF guard blocks localhost, loopback, private ranges, and non-http schemes."""
    restricted_targets = [
        "http://localhost:3000/internal",
        "http://127.0.0.1:8000/debug",
        "http://10.0.0.1/admin",
        "http://192.168.1.1/router",
        "http://169.254.169.254/latest/meta-data",
        "ftp://internal-server.local/file.txt",
    ]

    for target in restricted_targets:
        payload = {
            "kind": "live_url",
            "source": target,
            "requirementIds": ["req_demo1_ui"],
            "submitterClaim": "Testing SSRF guard.",
        }
        response = client.post("/api/promises/PP-DEMO1-2026/evidence", json=payload)
        assert response.status_code in (400, 422), f"Expected SSRF block for {target}"


def test_direct_file_upload_and_download(client):
    """Test direct multipart upload POST /api/promises/{id}/evidence/files and GET download."""
    file_content = b"Mock document content verifying security requirement checklist."
    files = {
        "file": ("security_checklist.pdf", io.BytesIO(file_content), "application/pdf"),
    }
    form_data = {
        "requirement_ids": '["req_demo1_ui"]',
        "submitter_claim": "Signed PDF document with security compliance and audit checklist.",
        "title": "Security Checklist Document",
    }

    response = client.post(
        "/api/promises/PP-DEMO1-2026/evidence/files",
        files=files,
        data=form_data,
    )
    assert response.status_code == 201
    data = response.json()

    assert data["kind"] == "document"
    assert data["title"] == "Security Checklist Document"
    assert data["storageKey"] is not None
    assert "downloadUrl" in data

    evidence_id = data["evidenceId"]

    # Now verify downloading the file
    download_res = client.get(f"/api/promises/PP-DEMO1-2026/evidence/{evidence_id}/download")
    assert download_res.status_code == 200
    assert download_res.content == file_content
    assert download_res.headers["X-Content-Type-Options"] == "nosniff"
