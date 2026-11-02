//! PromisePay Rust Cryptographic Verification Engine
//! CLI entrypoint for fast, deterministic Merkle tree proofs and dossier sealing.

mod dossier;
mod merkle;

use std::io::{self, Read};
use std::process;
use dossier::{seal_dossier, verify_dossier, DossierSealInput};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct VerifyPayload {
    input: DossierSealInput,
    claimed_seal: String,
    claimed_merkle_root: String,
}

#[derive(Debug, Serialize)]
struct VerifyResult {
    valid: bool,
    engine: &'static str,
}

#[derive(Debug, Deserialize)]
struct MerklePayload {
    hashes: Vec<String>,
}

#[derive(Debug, Serialize)]
struct MerkleResult {
    leaf_count: usize,
    merkle_root: String,
    engine: &'static str,
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("help");

    match command {
        "seal" => {
            let mut buffer = String::new();
            if let Err(e) = io::stdin().read_to_string(&mut buffer) {
                eprintln!("Error reading stdin: {}", e);
                process::exit(1);
            }
            match serde_json::from_str::<DossierSealInput>(&buffer) {
                Ok(input) => {
                    let proof = seal_dossier(&input);
                    let out = serde_json::to_string(&proof).expect("Failed to serialize proof");
                    println!("{}", out);
                }
                Err(e) => {
                    eprintln!("Invalid JSON payload for DossierSealInput: {}", e);
                    process::exit(1);
                }
            }
        }
        "merkle" => {
            let mut buffer = String::new();
            if let Err(e) = io::stdin().read_to_string(&mut buffer) {
                eprintln!("Error reading stdin: {}", e);
                process::exit(1);
            }
            match serde_json::from_str::<MerklePayload>(&buffer) {
                Ok(payload) => {
                    let root = merkle::compute_merkle_root(&payload.hashes);
                    let res = MerkleResult {
                        leaf_count: payload.hashes.len(),
                        merkle_root: root,
                        engine: "rust-promisepay-verify",
                    };
                    println!("{}", serde_json::to_string(&res).unwrap());
                }
                Err(e) => {
                    eprintln!("Invalid JSON payload for MerklePayload: {}", e);
                    process::exit(1);
                }
            }
        }
        "verify" => {
            let mut buffer = String::new();
            if let Err(e) = io::stdin().read_to_string(&mut buffer) {
                eprintln!("Error reading stdin: {}", e);
                process::exit(1);
            }
            match serde_json::from_str::<VerifyPayload>(&buffer) {
                Ok(payload) => {
                    let is_valid = verify_dossier(
                        &payload.input,
                        &payload.claimed_seal,
                        &payload.claimed_merkle_root,
                    );
                    let res = VerifyResult {
                        valid: is_valid,
                        engine: "rust-promisepay-verify",
                    };
                    println!("{}", serde_json::to_string(&res).unwrap());
                }
                Err(e) => {
                    eprintln!("Invalid JSON payload for VerifyPayload: {}", e);
                    process::exit(1);
                }
            }
        }
        "--version" | "-v" | "version" => {
            println!("promisepay-verify 0.1.0 (Rust cryptographic engine)");
        }
        _ => {
            eprintln!("PromisePay Cryptographic Verification Engine");
            eprintln!("Usage: promisepay-verify [seal|merkle|verify|version]");
            eprintln!("  seal   : Accepts JSON DossierSealInput via stdin, returns DossierProof");
            eprintln!("  merkle : Accepts JSON {{\"hashes\": [...]}} via stdin, returns Merkle root");
            eprintln!("  verify : Accepts JSON VerifyPayload via stdin, returns validation result");
            process::exit(0);
        }
    }
}
