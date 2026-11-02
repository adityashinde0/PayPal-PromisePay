"""Unit tests for Automated PayPal Dispute Defense Dossier Generation."""

import json


def test_get_dispute_defense_dossier_success(client):
    """Test generating a complete cryptographic Dispute Defense Dossier."""
    res = client.get("/api/promises/PP-DEMO1-2026/dispute-defense-dossier")
    assert res.status_code == 200
    data = res.json()

    assert data["dossierId"].startswith("dos_")
    assert data["promiseId"] == "PP-DEMO1-2026"
    assert data["paypalDefenseReady"] is True
    assert "PayPal" in data["complianceStatement"]

    # Check Agreement
    agreement = data["agreement"]
    assert agreement["title"] == "Next.js Headless E-Commerce Storefront"
    assert agreement["amount"]["value"] == "450.00"
    assert len(agreement["requirements"]) >= 2

    # Check PayPal Transaction
    paypal_tx = data["paypalTransaction"]
    assert paypal_tx["orderId"] == "8XY82019AA120934K"
    assert paypal_tx["captureId"] == "44D091243B590219M"
    assert paypal_tx["state"] == "CAPTURED"

    # Check Cryptographic Evidence & Proof
    crypto_ev = data["cryptographicEvidence"]
    assert crypto_ev["totalItems"] >= 2
    assert len(crypto_ev["aggregateManifestHash"]) == 64
    assert len(crypto_ev["merkleRoot"]) == 64
    for item in crypto_ev["items"]:
        assert "evidenceId" in item
        assert len(item["sha256"]) == 64
        assert item["provenance"]["isClaimOnly"] is True

    proof = data["cryptographicProof"]
    assert proof["engine"] in ["rust-promisepay-verify", "python-fallback"]
    assert proof["seal_hash"].startswith("PP-SEAL-")
    assert proof["verified"] is True
    assert proof["merkle_root"] == crypto_ev["merkleRoot"]

    # Check AI Verification Audit section
    ai_audit = data["aiVerificationAudit"]
    assert "hasVerification" in ai_audit
    assert "findings" in ai_audit


def test_download_dispute_defense_dossier(client):
    """Test downloading the dossier as an attachment file."""
    res = client.get("/api/promises/PP-DEMO1-2026/dispute-defense-dossier?download=true")
    assert res.status_code == 200
    assert 'attachment; filename="dispute_dossier_PP-DEMO1-2026.json"' in res.headers.get(
        "content-disposition", ""
    )

    # Content must be valid JSON
    parsed = json.loads(res.text)
    assert parsed["promiseId"] == "PP-DEMO1-2026"
    assert parsed["paypalDefenseReady"] is True


def test_dossier_not_found(client):
    """Test 404 response for nonexistent promise."""
    res = client.get("/api/promises/PP-NONEXISTENT/dispute-defense-dossier")
    assert res.status_code == 404
