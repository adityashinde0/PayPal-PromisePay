"""Rust Cryptographic Proof Engine Bridge for PayPal PromisePay.

Provides high-performance Merkle tree calculation and dispute dossier sealing.
Uses the compiled Rust binary `promisepay-verify` when available, with a
transparent, deterministic pure-Python fallback for environments without Rust.
"""

from __future__ import annotations

import hashlib
import json
import logging
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _find_project_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "crates" / "promisepay-verify").is_dir():
            return parent
    return current.parents[4] if len(current.parents) > 4 else current.parent


_PROJECT_ROOT = _find_project_root()
_RUST_BIN_CANDIDATES = [
    _PROJECT_ROOT / "crates" / "promisepay-verify" / "target" / "release" / "promisepay-verify.exe",
    _PROJECT_ROOT / "crates" / "promisepay-verify" / "target" / "release" / "promisepay-verify",
    _PROJECT_ROOT / "crates" / "promisepay-verify" / "target" / "debug" / "promisepay-verify.exe",
    _PROJECT_ROOT / "crates" / "promisepay-verify" / "target" / "debug" / "promisepay-verify",
]


def get_rust_binary_path() -> Optional[Path]:
    """Returns the Path to the compiled Rust binary if present and executable."""
    for path in _RUST_BIN_CANDIDATES:
        if path.is_file():
            return path
    return None
    return None


def is_rust_engine_available() -> bool:
    """Returns True if the native Rust verification binary is available."""
    return get_rust_binary_path() is not None


# ==============================================================================
# Pure Python Fallback (Guarantees 100% interoperability without Rust toolchain)
# ==============================================================================


def _py_compute_merkle_root(leaf_hashes: List[str]) -> str:
    """Computes a deterministic pairwise SHA-256 Merkle root identical to the Rust implementation."""
    if not leaf_hashes:
        return hashlib.sha256(b"PROMISEPAY_EMPTY_MANIFEST").hexdigest()

    if len(leaf_hashes) == 1:
        return hashlib.sha256(leaf_hashes[0].encode("utf-8")).hexdigest()

    # Sort lexicographically for deterministic ordering
    current_layer = [hashlib.sha256(h.encode("utf-8")).digest() for h in sorted(leaf_hashes)]

    while len(current_layer) > 1:
        next_layer = []
        i = 0
        while i < len(current_layer):
            left = current_layer[i]
            right = current_layer[i + 1] if i + 1 < len(current_layer) else left
            h = hashlib.sha256()
            h.update(left)
            h.update(right)
            next_layer.append(h.digest())
            i += 2
        current_layer = next_layer

    return current_layer[0].hex()


def _py_seal_dossier(
    promise_id: str,
    evidence_hashes: List[str],
    requirements_count: int,
    timestamp: str,
    paypal_order_id: Optional[str] = None,
    paypal_capture_id: Optional[str] = None,
    ai_outcome: Optional[str] = None,
) -> Dict[str, Any]:
    start = time.perf_counter_ns()
    merkle_root = _py_compute_merkle_root(evidence_hashes)

    order_id = paypal_order_id or "NONE"
    capture_id = paypal_capture_id or "NONE"
    outcome = ai_outcome or "NONE"

    canonical = (
        f"PROMISEPAY_SEAL_V1|{promise_id}|{order_id}|{capture_id}|"
        f"{merkle_root}|{outcome}|{requirements_count}|{timestamp}"
    )
    composite_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    seal_hash = f"PP-SEAL-{composite_hash}"

    elapsed_micros = (time.perf_counter_ns() - start) // 1000

    return {
        "engine": "python-fallback",
        "version": "0.1.0",
        "leaf_count": len(evidence_hashes),
        "merkle_root": merkle_root,
        "seal_hash": seal_hash,
        "execution_micros": elapsed_micros,
        "verified": True,
    }


# ==============================================================================
# Unified Public API
# ==============================================================================


def seal_dispute_dossier(
    promise_id: str,
    evidence_hashes: List[str],
    requirements_count: int,
    timestamp: str,
    paypal_order_id: Optional[str] = None,
    paypal_capture_id: Optional[str] = None,
    ai_outcome: Optional[str] = None,
) -> Dict[str, Any]:
    """Generates a cryptographic Merkle root and tamper-evident seal for a dossier.

    Attempts native Rust execution first for sub-millisecond execution; falls back
    to pure Python if binary is missing.
    """
    bin_path = get_rust_binary_path()
    payload = {
        "promise_id": promise_id,
        "paypal_order_id": paypal_order_id,
        "paypal_capture_id": paypal_capture_id,
        "evidence_hashes": evidence_hashes,
        "ai_outcome": ai_outcome,
        "requirements_count": requirements_count,
        "timestamp": timestamp,
    }

    if bin_path:
        try:
            res = subprocess.run(
                [str(bin_path), "seal"],
                input=json.dumps(payload),
                text=True,
                capture_output=True,
                timeout=5.0,
                check=True,
            )
            data = json.loads(res.stdout)
            return data
        except Exception as exc:
            logger.warning("Rust verifier execution failed, using Python fallback: %s", exc)

    return _py_seal_dossier(
        promise_id=promise_id,
        evidence_hashes=evidence_hashes,
        requirements_count=requirements_count,
        timestamp=timestamp,
        paypal_order_id=paypal_order_id,
        paypal_capture_id=paypal_capture_id,
        ai_outcome=ai_outcome,
    )


def compute_merkle_root(leaf_hashes: List[str]) -> str:
    """Computes deterministic Merkle root using Rust engine if available, else Python fallback."""
    bin_path = get_rust_binary_path()
    if bin_path:
        try:
            res = subprocess.run(
                [str(bin_path), "merkle"],
                input=json.dumps({"hashes": leaf_hashes}),
                text=True,
                capture_output=True,
                timeout=5.0,
                check=True,
            )
            data = json.loads(res.stdout)
            return data.get("merkle_root", "")
        except Exception as exc:
            logger.warning("Rust Merkle calculation failed, using Python fallback: %s", exc)

    return _py_compute_merkle_root(leaf_hashes)


def verify_dossier_seal(
    payload: Dict[str, Any],
    claimed_seal: str,
    claimed_merkle_root: str,
) -> bool:
    """Verifies a claimed seal and Merkle root against payload data."""
    bin_path = get_rust_binary_path()
    if bin_path:
        try:
            res = subprocess.run(
                [str(bin_path), "verify"],
                input=json.dumps(
                    {
                        "input": payload,
                        "claimed_seal": claimed_seal,
                        "claimed_merkle_root": claimed_merkle_root,
                    }
                ),
                text=True,
                capture_output=True,
                timeout=5.0,
                check=True,
            )
            data = json.loads(res.stdout)
            return bool(data.get("valid", False))
        except Exception as exc:
            logger.warning("Rust verifier verification failed, using Python fallback: %s", exc)

    py_proof = _py_seal_dossier(
        promise_id=payload["promise_id"],
        evidence_hashes=payload["evidence_hashes"],
        requirements_count=payload["requirements_count"],
        timestamp=payload["timestamp"],
        paypal_order_id=payload.get("paypal_order_id"),
        paypal_capture_id=payload.get("paypal_capture_id"),
        ai_outcome=payload.get("ai_outcome"),
    )
    return py_proof["seal_hash"] == claimed_seal and py_proof["merkle_root"] == claimed_merkle_root
