"""Unit tests for the Rust & Python Cryptographic Proof Engine."""

from promisepay_api.services.rust_verifier import (
    _py_compute_merkle_root,
    compute_merkle_root,
    seal_dispute_dossier,
    verify_dossier_seal,
)


def test_empty_merkle_root():
    root = compute_merkle_root([])
    assert len(root) == 64
    assert root == _py_compute_merkle_root([])


def test_single_leaf_merkle_root():
    h = "4f8b9a7c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a"
    root = compute_merkle_root([h])
    assert len(root) == 64


def test_deterministic_lexicographical_merkle_root():
    h1 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    h2 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    r1 = compute_merkle_root([h1, h2])
    r2 = compute_merkle_root([h2, h1])
    assert r1 == r2, "Leaf sorting must guarantee identical Merkle root regardless of upload order"


def test_dossier_sealing_and_verification():
    promise_id = "PP-DEMO1-2026"
    hashes = [
        "4f8b9a7c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a",
        "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    ]
    timestamp = "2026-11-02T12:00:00Z"

    proof = seal_dispute_dossier(
        promise_id=promise_id,
        evidence_hashes=hashes,
        requirements_count=3,
        timestamp=timestamp,
        paypal_order_id="ORDER-1234",
        paypal_capture_id="CAP-5678",
        ai_outcome="VERIFIED_COMPLETE",
    )

    assert "seal_hash" in proof
    assert proof["seal_hash"].startswith("PP-SEAL-")
    assert "merkle_root" in proof
    assert len(proof["merkle_root"]) == 64
    assert proof["leaf_count"] == 2
    assert proof["verified"] is True
    assert proof["engine"] in ["rust-promisepay-verify", "python-fallback"]

    # Verify seal validation
    input_payload = {
        "promise_id": promise_id,
        "paypal_order_id": "ORDER-1234",
        "paypal_capture_id": "CAP-5678",
        "evidence_hashes": hashes,
        "ai_outcome": "VERIFIED_COMPLETE",
        "requirements_count": 3,
        "timestamp": timestamp,
    }

    assert verify_dossier_seal(input_payload, proof["seal_hash"], proof["merkle_root"]) is True

    # Tampered verification
    tampered_payload = dict(input_payload)
    tampered_payload["evidence_hashes"] = [
        hashes[0],
        "0000000000000000000000000000000000000000000000000000000000000000",
    ]
    assert verify_dossier_seal(tampered_payload, proof["seal_hash"], proof["merkle_root"]) is False
