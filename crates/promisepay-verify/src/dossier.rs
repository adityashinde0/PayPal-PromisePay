//! Cryptographic Dossier sealing and tamper-verification for PayPal PromisePay.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Instant;

use crate::merkle::compute_merkle_root;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DossierSealInput {
    pub promise_id: String,
    pub paypal_order_id: Option<String>,
    pub paypal_capture_id: Option<String>,
    pub evidence_hashes: Vec<String>,
    pub ai_outcome: Option<String>,
    pub requirements_count: usize,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DossierProof {
    pub engine: String,
    pub version: String,
    pub leaf_count: usize,
    pub merkle_root: String,
    pub seal_hash: String,
    pub execution_micros: u128,
    pub verified: bool,
}

/// Seals a dossier with a deterministic Merkle root and tamper-evident SHA-256 seal.
pub fn seal_dossier(input: &DossierSealInput) -> DossierProof {
    let start = Instant::now();

    // 1. Deterministic pairwise Merkle root across all evidence hashes
    let merkle_root = compute_merkle_root(&input.evidence_hashes);

    // 2. Compute composite digest binding the promise, PayPal transaction, Merkle root, and AI outcome
    let order_id = input.paypal_order_id.as_deref().unwrap_or("NONE");
    let capture_id = input.paypal_capture_id.as_deref().unwrap_or("NONE");
    let outcome = input.ai_outcome.as_deref().unwrap_or("NONE");

    let canonical_payload = format!(
        "PROMISEPAY_SEAL_V1|{}|{}|{}|{}|{}|{}|{}",
        input.promise_id,
        order_id,
        capture_id,
        merkle_root,
        outcome,
        input.requirements_count,
        input.timestamp
    );

    let mut hasher = Sha256::new();
    hasher.update(canonical_payload.as_bytes());
    let composite_hash = hex::encode(hasher.finalize());
    let seal_hash = format!("PP-SEAL-{}", composite_hash);

    let elapsed = start.elapsed().as_micros();

    DossierProof {
        engine: "rust-promisepay-verify".to_string(),
        version: "0.1.0".to_string(),
        leaf_count: input.evidence_hashes.len(),
        merkle_root,
        seal_hash,
        execution_micros: elapsed,
        verified: true,
    }
}

/// Verifies whether an existing dossier's claimed Merkle root and seal hash are authentic.
pub fn verify_dossier(input: &DossierSealInput, claimed_seal: &str, claimed_merkle_root: &str) -> bool {
    let computed = seal_dossier(input);
    computed.seal_hash == claimed_seal && computed.merkle_root == claimed_merkle_root
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seal_and_verify_success() {
        let input = DossierSealInput {
            promise_id: "PP-DEMO1-2026".to_string(),
            paypal_order_id: Some("ORDER-9912".to_string()),
            paypal_capture_id: Some("CAP-4411".to_string()),
            evidence_hashes: vec![
                "4f8b9a7c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a".to_string(),
                "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b".to_string(),
            ],
            ai_outcome: Some("VERIFIED_COMPLETE".to_string()),
            requirements_count: 3,
            timestamp: "2026-11-02T12:00:00Z".to_string(),
        };

        let proof = seal_dossier(&input);
        assert!(proof.seal_hash.starts_with("PP-SEAL-"));
        assert_eq!(proof.leaf_count, 2);
        assert!(proof.verified);

        let is_valid = verify_dossier(&input, &proof.seal_hash, &proof.merkle_root);
        assert!(is_valid);
    }

    #[test]
    fn test_tamper_fails_verification() {
        let mut input = DossierSealInput {
            promise_id: "PP-DEMO1-2026".to_string(),
            paypal_order_id: Some("ORDER-9912".to_string()),
            paypal_capture_id: Some("CAP-4411".to_string()),
            evidence_hashes: vec!["aaaa".to_string(), "bbbb".to_string()],
            ai_outcome: Some("VERIFIED_COMPLETE".to_string()),
            requirements_count: 2,
            timestamp: "2026-11-02T12:00:00Z".to_string(),
        };

        let proof = seal_dossier(&input);

        // Tamper with an evidence hash
        input.evidence_hashes[0] = "aaab".to_string();

        let is_valid = verify_dossier(&input, &proof.seal_hash, &proof.merkle_root);
        assert!(!is_valid, "Tampered evidence must fail dossier cryptographic verification");
    }
}

