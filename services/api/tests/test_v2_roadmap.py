"""Comprehensive Test Suite for PayPal PromisePay V2 Industry-Ready Roadmap (Goals 1 - 5)."""

import pytest

from promisepay_api.auth import create_access_token, verify_live_jwt
from promisepay_api.services.multimodal_ai import multimodal_ai
from promisepay_api.services.promise_store import promise_store
from promisepay_api.services.scraper import scraper

# ==============================================================================
# Goal 1: Live Multi-Tenant Identity & RBAC (V2.1)
# ==============================================================================


def test_v2_jwt_creation_and_cryptographic_verification():
    """Tests JWT generation and cryptographic verification."""
    token = create_access_token(
        user_id="usr_buyer_99",
        email="buyer99@promisepay.example",
        role="BUYER",
        org_id="00000000-0000-0000-0000-000000000001",
    )
    user = verify_live_jwt(token)
    assert user is not None
    assert user.userId == "usr_buyer_99"
    assert user.role == "BUYER"
    assert user.email == "buyer99@promisepay.example"


def test_v2_auth_router_login_and_signup(client):
    """Tests /api/auth/login, /api/auth/signup, and /api/auth/me endpoints."""
    # 1. Login with demo account
    login_res = client.post(
        "/api/auth/login",
        json={"email": "seller@promisepay.example", "password": "password123"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["user"]["role"] == "SELLER"
    assert "token" in login_data

    # 2. Signup new organization user
    signup_res = client.post(
        "/api/auth/signup",
        json={
            "email": "newtenant@example.com",
            "password": "securepassword",
            "role": "BUYER",
            "fullName": "Jane Client",
        },
    )
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert signup_data["user"]["email"] == "newtenant@example.com"
    assert signup_data["user"]["role"] == "BUYER"

    # 3. Call authenticated /me using issued token
    seller_token = login_data["token"]
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {seller_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "SELLER"


def test_v2_rbac_permission_gating(client):
    """Enforces that non-authorized roles receive 403 Forbidden on privileged operations."""
    buyer_token = create_access_token(user_id="usr_b", email="b@example.com", role="BUYER")

    # A BUYER cannot record human decisions on resolution cases (requires REVIEWER/ADMIN)
    res = client.post(
        "/api/resolution-cases/case_nonexistent/decisions",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"decision": "RECOMMEND_REFUND", "reason": "Buyer attempting unauthorized sign-off"},
    )
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]


# ==============================================================================
# Goal 2: Real Multi-Modal Evidence & Headless Scraper (V2.2)
# ==============================================================================


@pytest.mark.asyncio
async def test_v2_headless_scraper_deliverable_crawl():
    """Tests the automated web crawler generates latency, DOM text, and viewport screenshots."""
    result = await scraper.scrape_deliverable("https://example.com")
    assert result["url"] == "https://example.com"
    assert result["statusCode"] in (200, 201, 301, 302)
    assert result["latencyMs"] >= 0.0
    assert "screenshotBase64" in result
    assert result["screenshotBase64"].startswith("data:image/png;base64,")
    assert len(result["sections"]) > 0


@pytest.mark.asyncio
async def test_v2_multimodal_document_ai_ocr():
    """Tests multimodal vision OCR service extracts entities and requirement mappings."""
    mock_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    reqs = [{"key": "REQ_UI", "title": "Responsive Checkout Viewport"}]

    ocr_result = await multimodal_ai.extract_document_ocr(
        file_bytes=mock_bytes,
        mime_type="image/png",
        requirements=reqs,
    )
    assert ocr_result["documentType"] is not None
    assert len(ocr_result["extractedEntities"]) > 0
    assert len(ocr_result["requirementMappings"]) == 1
    assert ocr_result["requirementMappings"][0]["requirementKey"] == "REQ_UI"


def test_v2_evidence_registration_with_scraper(client):
    """Tests that registering URL evidence triggers scraper and stores viewport metadata."""
    payload = {
        "kind": "live_url",
        "title": "Deployed Production App",
        "source": "https://github.com",
        "requirementIds": ["req_demo1_flow"],
        "submitterClaim": "Live production e-commerce store with functional shopping cart.",
    }
    res = client.post(
        "/api/promises/PP-DEMO1-2026/evidence",
        json=payload,
    )
    assert res.status_code == 201
    ev_data = res.json()
    assert ev_data["kind"] == "live_url"
    assert "provenance" in ev_data
    assert "crawler" in ev_data["provenance"]["metadata"]
    assert ev_data["provenance"]["metadata"]["crawler"]["statusCode"] in (200, 201, 301, 302)


# ==============================================================================
# Goal 3: PayPal Partner Onboarding & PPCP Delayed Escrow (V2.3)
# ==============================================================================


def test_v2_paypal_partner_referrals_and_merchant_status(client):
    """Tests PayPal Partner Referrals API onboarding link generation and status check."""
    # 1. Partner Referral generation
    ref_res = client.post(
        "/api/promises/partner-referrals",
        json={"returnUrl": "http://localhost:3000/settings"},
    )
    assert ref_res.status_code == 200
    ref_data = ref_res.json()
    assert "actionUrl" in ref_data
    assert "referralToken=" in ref_data["actionUrl"] or "bizsignup" in ref_data["actionUrl"]

    # 2. Merchant Status check
    status_res = client.get("/api/promises/merchants/usr_merchant_01/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["merchantId"] == "usr_merchant_01"
    assert status_data["status"] == "ACTIVE"
    assert "PPCP_DELAYED_ESCROW" in status_data["capabilities"]


# ==============================================================================
# Goal 4: Real-Time Event Streaming (Server-Sent Events) (V2.4)
# ==============================================================================


def test_v2_realtime_event_publish_and_sse_connectivity(client):
    """Tests publishing to real-time event broadcaster for a promise."""
    publish_res = client.post(
        "/api/promises/PP-DEMO1-2026/events",
        json={
            "eventType": "EVIDENCE_SCANNING",
            "payload": {"evidenceCount": 2, "scanner": "promisepay-guard-v2"},
        },
    )
    assert publish_res.status_code == 202
    assert publish_res.json()["status"] == "BROADCASTED"


# ==============================================================================
# Goal 5: Live PayPal Disputes API Bidirectional Sync (V2.5)
# ==============================================================================


def test_v2_paypal_dispute_webhook_and_dossier_auto_dispatch(client):
    """Tests that CUSTOMER.DISPUTE.CREATED webhook marks promise REVIEW_REQUIRED and dispatches dossier."""
    webhook_payload = {
        "id": "WH-TEST-DISPUTE-001",
        "event_type": "CUSTOMER.DISPUTE.CREATED",
        "resource": {
            "dispute_id": "PP-D-998877",
            "reason": "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
            "custom_id": "PP-DEMO1-2026",
            "dispute_amount": {"value": "450.00", "currency_code": "USD"},
        },
    }
    headers = {
        "paypal-transmission-id": "trans_dispute_001",
        "paypal-transmission-time": "2026-11-04T10:00:00Z",
        "paypal-cert-url": "https://api.paypal.com/cert.pem",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "mock_sig_dispute",
    }
    res = client.post("/api/webhooks/paypal", headers=headers, json=webhook_payload)
    assert res.status_code == 200

    # Verify promise transitioned to REVIEW_REQUIRED with dispute case attached
    p = promise_store.get("PP-DEMO1-2026")
    assert p.status.value == "REVIEW_REQUIRED"
    assert p.resolution.caseId == "paypal_PP-D-998877"
    assert p.resolution.status == "DISPUTED"
    assert any(t.eventType == "PAYPAL_DISPUTE_OPENED" for t in p.timeline)


def test_v2_dispute_defense_dossier_download(client):
    """Tests single-click Export Dispute Dossier generates full cryptographic bundle with Merkle root."""
    res = client.get("/api/promises/PP-DEMO1-2026/dispute-defense-dossier?download=true")
    assert res.status_code == 200
    assert "attachment; filename=" in res.headers["content-disposition"]
    data = res.json()
    assert "dossierId" in data
    assert "cryptographicProof" in data
    assert "merkle_root" in data["cryptographicProof"]
    assert data["paypalDefenseReady"] is True
