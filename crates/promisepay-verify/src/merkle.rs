//! Deterministic Merkle Tree implementation for PromisePay evidence provenance.

use sha2::{Digest, Sha256};

/// Computes a pairwise SHA-256 Merkle root from a slice of leaf hashes (hex strings).
pub fn compute_merkle_root(leaf_hashes: &[String]) -> String {
    if leaf_hashes.is_empty() {
        // Deterministic hash of empty manifest
        let mut hasher = Sha256::new();
        hasher.update(b"PROMISEPAY_EMPTY_MANIFEST");
        return hex::encode(hasher.finalize());
    }

    if leaf_hashes.len() == 1 {
        let mut hasher = Sha256::new();
        hasher.update(leaf_hashes[0].as_bytes());
        return hex::encode(hasher.finalize());
    }

    let mut current_layer: Vec<Vec<u8>> = leaf_hashes
        .iter()
        .map(|h| {
            let mut hasher = Sha256::new();
            hasher.update(h.as_bytes());
            hasher.finalize().to_vec()
        })
        .collect();

    // Sort leaves lexicographically to ensure deterministic ordering regardless of upload order
    current_layer.sort();

    while current_layer.len() > 1 {
        let mut next_layer = Vec::new();
        let mut i = 0;
        while i < current_layer.len() {
            let left = &current_layer[i];
            let right = if i + 1 < current_layer.len() {
                &current_layer[i + 1]
            } else {
                left // Duplicate if odd number of leaves
            };

            let mut hasher = Sha256::new();
            hasher.update(left);
            hasher.update(right);
            next_layer.push(hasher.finalize().to_vec());
            i += 2;
        }
        current_layer = next_layer;
    }

    hex::encode(&current_layer[0])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_manifest() {
        let root = compute_merkle_root(&[]);
        assert_eq!(root.len(), 64);
    }

    #[test]
    fn test_single_leaf() {
        let hashes = vec!["4f8b9a7c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a".to_string()];
        let root = compute_merkle_root(&hashes);
        assert_eq!(root.len(), 64);
    }

    #[test]
    fn test_deterministic_ordering() {
        let h1 = "aaaa".to_string();
        let h2 = "bbbb".to_string();
        let r1 = compute_merkle_root(&[h1.clone(), h2.clone()]);
        let r2 = compute_merkle_root(&[h2, h1]);
        // Lexicographical sorting guarantees identical Merkle root regardless of order
        assert_eq!(r1, r2);
    }

    #[test]
    fn test_tamper_detection() {
        let h1 = "4f8b9a7c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a".to_string();
        let h2 = "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b".to_string();
        let root_original = compute_merkle_root(&[h1.clone(), h2.clone()]);

        let h2_tampered = "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2c".to_string();
        let root_tampered = compute_merkle_root(&[h1, h2_tampered]);

        assert_ne!(root_original, root_tampered);
    }
}

