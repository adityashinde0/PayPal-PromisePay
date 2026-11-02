"""Repository secret scanner script."""

import os
import re
import sys
from pathlib import Path

# High-entropy / private key / token regexes
PATTERNS = [
    (re.compile(r"-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----"), "Private Key"),
    (re.compile(r"EAACEdEose0cBA[0-9A-Za-z]+"), "Facebook Access Token"),
    (
        re.compile(r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}"),
        "AWS Access Key ID",
    ),
    (re.compile(r"AIza[0-9A-Za-z\\-_]{35}"), "Google API Key"),
    (re.compile(r"sk_live_[0-9a-zA-Z]{24}"), "Stripe Live Secret Key"),
    (
        re.compile(r"access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32}"),
        "PayPal Live Token",
    ),
]

IGNORED_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    ".next",
    "__pycache__",
    ".pytest_cache",
}
ROOT_DIR = Path(__file__).resolve().parent.parent.parent


def scan():
    print("=== Scanning Repository for Accidental Secrets ===")
    violations = []

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        for f in files:
            file_path = Path(root) / f
            # Skip binary / large files
            if file_path.suffix in {
                ".png",
                ".jpg",
                ".jpeg",
                ".ico",
                ".pdf",
                ".lock",
                ".pyc",
            }:
                continue
            if file_path.name in {".env.example"}:
                continue
            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for pattern, name in PATTERNS:
                    if pattern.search(content):
                        violations.append((file_path, name))
            except OSError:
                continue

    if violations:
        print("[FAIL] Potential secrets detected:")
        for path, name in violations:
            print(f"  - {path}: {name}")
        return 1

    print("[PASS] No exposed secrets detected in repository files.")
    return 0


if __name__ == "__main__":
    sys.exit(scan())
