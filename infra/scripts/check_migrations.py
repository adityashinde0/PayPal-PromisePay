"""Migration validator and runner utility for PromisePay."""

import re
import sys
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "supabase" / "migrations"
SEED_FILE = Path(__file__).resolve().parent.parent / "supabase" / "seed.sql"


def validate_sql_file(file_path: Path) -> bool:
    """Basic structural and safety validation of SQL migration scripts."""
    if not file_path.exists():
        print(f"[FAIL] File not found: {file_path}")
        return False

    content = file_path.read_text(encoding="utf-8")

    # Check for forbidden secrets / hardcoded passwords
    secret_patterns = [
        re.compile(r"password\s*=\s*['\"][^'\"]+['\"]", re.IGNORECASE),
        re.compile(r"secret\s*=\s*['\"][^'\"]+['\"]", re.IGNORECASE),
    ]
    for pattern in secret_patterns:
        if pattern.search(content):
            print(f"[FAIL] Potential hardcoded credential in {file_path}")
            return False

    # Check for basic SQL statements
    if "CREATE TABLE" not in content and "INSERT INTO" not in content:
        print(f"[WARN] No CREATE TABLE or INSERT INTO statements in {file_path}")

    print(
        f"[PASS] {file_path.name} verified successfully ({len(content.splitlines())} lines)."
    )
    return True


def run_checks() -> int:
    print("=== Validating Database Migrations & Seeds ===")
    migrations = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migrations:
        print(f"[FAIL] No migration files found in {MIGRATIONS_DIR}")
        return 1

    success = True
    for migration in migrations:
        if not validate_sql_file(migration):
            success = False

    if SEED_FILE.exists() and not validate_sql_file(SEED_FILE):
        success = False

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(run_checks())
