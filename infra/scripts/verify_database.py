"""
Comprehensive Database Integrity and Operations Verification Script
Validates connection, schema initialization, and reproducible CRUD operations on SQLite promisepay.db.
Uses synchronous SQLAlchemy 2.0 Engine and native sqlite3 driver for deterministic execution.
"""

import os
import sqlite3
import sys
from datetime import datetime, timezone

# Ensure project paths are in sys.path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "services", "api"))
)

from promisepay_api.db.models import (
    AuditLogModel,
    Base,
    EvidenceModel,
    OrganizationModel,
    PaymentModel,
    PromiseModel,
    PromiseRequirementModel,
    PromiseVersionModel,
    UserModel,
)
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session


def log(msg: str):
    print(f"[{datetime.now(timezone.utc).isoformat()}] {msg}")


def verify_database():
    log("=== STARTING COMPREHENSIVE DATABASE VERIFICATION ===")

    db_file = os.path.abspath("promisepay.db")
    log(f"Target SQLite database path: {db_file}")

    # Step 1: Initialize Schema using SQLAlchemy Engine
    log("Step 1: Connecting via SQLAlchemy engine and creating all 16 model tables...")
    sync_engine = create_engine(f"sqlite:///{db_file}", echo=False)
    Base.metadata.create_all(sync_engine)
    log("Database schema synchronization complete.")

    # Step 2: Verify Schema Integrity via Raw sqlite3 driver
    log("Step 2: Inspecting table catalog via independent native sqlite3 connection...")
    conn_raw = sqlite3.connect(db_file)
    cursor = conn_raw.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [r[0] for r in cursor.fetchall() if not r[0].startswith("sqlite_")]
    log(f"Detected {len(tables)} tables in promisepay.db: {', '.join(tables)}")

    expected_tables = [
        "audit_logs",
        "evidence",
        "evidence_requirements",
        "organization_members",
        "organizations",
        "payments",
        "paypal_events",
        "promise_requirements",
        "promise_versions",
        "promises",
        "resolution_cases",
        "resolution_decisions",
        "users",
        "verification_plans",
        "verification_results",
        "verification_runs",
    ]
    missing = [t for t in expected_tables if t not in tables]
    if missing:
        raise RuntimeError(f"Missing expected tables: {missing}")
    log(f"Schema integrity verified: All {len(expected_tables)} required domain tables exist!")

    # Step 3: CRUD Operations via SQLAlchemy Session
    log("Step 3: Ensuring parent organization and users exist...")
    org_id = "00000000-0000-0000-0000-000000000001"
    user_buyer_id = "10000000-0000-0000-0000-000000000001"
    user_seller_id = "10000000-0000-0000-0000-000000000002"

    with Session(sync_engine) as session:
        org = session.get(OrganizationModel, org_id)
        if not org:
            org = OrganizationModel(
                id=org_id,
                name="Acme Digital Labs",
                slug="acme-labs",
            )
            session.add(org)
            log(f"Inserted organization: {org.name} ({org.id})")

        buyer = session.get(UserModel, user_buyer_id)
        if not buyer:
            buyer = UserModel(
                id=user_buyer_id,
                auth_user_id="auth_alice_buyer",
                display_name="Alice Buyer (Demo)",
                email="alice.buyer@example.com",
            )
            session.add(buyer)
            log(f"Inserted buyer user: {buyer.display_name}")

        seller = session.get(UserModel, user_seller_id)
        if not seller:
            seller = UserModel(
                id=user_seller_id,
                auth_user_id="auth_bob_seller",
                display_name="Bob Merchant (Demo)",
                email="bob.merchant@example.com",
            )
            session.add(seller)
            log(f"Inserted seller user: {seller.display_name}")

        session.commit()

    # Step 4: CRUD Test - CREATE
    log("Step 4: Executing CRUD - CREATE record (Promise, Version, Requirements, Audit Log)...")
    test_promise_id = "PP-VERIFY-2026-001"
    test_title = "AI Security Audit & Cryptographic Dossier Engine"
    test_amount = 750.00
    test_category = "DIGITAL_PROJECT"
    test_status_initial = "READY_FOR_PAYMENT"

    with Session(sync_engine) as session:
        # Check if promise already exists, if so delete to ensure reproducible test
        existing = session.execute(
            select(PromiseModel).where(PromiseModel.promise_id == test_promise_id)
        ).scalar_one_or_none()
        if existing:
            session.delete(existing)
            session.commit()
            log(f"Cleared prior test record {test_promise_id} for clean reproduction.")

        # Create new Promise
        promise = PromiseModel(
            promise_id=test_promise_id,
            organization_id=org_id,
            buyer_id=user_buyer_id,
            seller_id=user_seller_id,
            title=test_title,
            category=test_category,
            status=test_status_initial,
            amount_value=test_amount,
            currency_code="USD",
            merchant_order_ref="ORD-REF-7711",
        )
        session.add(promise)
        session.flush()

        # Create Version 1
        version = PromiseVersionModel(
            promise_id=promise.id,
            version=1,
            source_text="Complete delivery of AI Security Audit and Merkle Dossier Engine.",
            structured_promise={"title": test_title, "amount": test_amount},
            approved_by="Alice Buyer",
        )
        session.add(version)
        session.flush()

        # Create 2 Atomic Requirements
        req1 = PromiseRequirementModel(
            promise_version_id=version.id,
            key="REQ-1",
            title="Adversarial Prompt Injection Firewall",
            description="Deploy regex and semantic firewall to block prompt injections.",
            priority=1,
            verification_method="CODE_REPOSITORY_INSPECTION",
        )
        req2 = PromiseRequirementModel(
            promise_version_id=version.id,
            key="REQ-2",
            title="RFC 6962 Merkle Tree Evidence Sealing",
            description="Cryptographically seal all dispute evidence into a verifiable tree.",
            priority=2,
            verification_method="CRYPTOGRAPHIC_PROOF_VERIFICATION",
        )
        session.add_all([req1, req2])

        # Create Audit Log
        audit = AuditLogModel(
            organization_id=org_id,
            promise_id=test_promise_id,
            actor_type="USER",
            actor_id="usr_verifier",
            event_type="PROMISE_CREATED",
            summary=f"Promise {test_promise_id} created for amount ${test_amount:.2f}",
            before_hash="GENESIS",
            after_hash="SHA256:a1b2c3d4e5f60718293a4b5c6d7e8f90",
            metadata_json={"title": test_title, "status": test_status_initial},
        )
        session.add(audit)
        session.commit()
        log(f"CREATE complete: Promise UUID={promise.id}, Promise ID={promise.promise_id}")

    # Step 5: CRUD Test - READ
    log("Step 5: Executing CRUD - READ record via SQLAlchemy Session...")
    with Session(sync_engine) as session:
        p = session.execute(
            select(PromiseModel).where(PromiseModel.promise_id == test_promise_id)
        ).scalar_one()

        log("READ verified:")
        log(f"  - UUID: {p.id}")
        log(f"  - Promise ID: {p.promise_id}")
        log(f"  - Title: {p.title}")
        log(f"  - Status: {p.status}")
        log(f"  - Amount: {p.amount_value} {p.currency_code}")
        log(f"  - Versions: {len(p.versions)}")
        if p.versions:
            log(f"  - Requirements in v1: {len(p.versions[0].requirements)}")
            for r in p.versions[0].requirements:
                log(f"      * [{r.key}] {r.title} ({r.verification_method})")

        assert p.promise_id == test_promise_id
        assert p.title == test_title
        assert float(p.amount_value) == test_amount
        assert p.status == test_status_initial

    # Step 6: CRUD Test - UPDATE
    log(
        "Step 6: Executing CRUD - UPDATE record (State transition, Payment capture, Evidence submission)..."
    )
    updated_title = "AI Security Audit & Cryptographic Dossier Engine [VERIFIED]"
    order_id = "ORD-VERIFY-998877"
    capture_id = "CAP-VERIFY-112233"
    evidence_id = "EVID-VERIFY-001"

    with Session(sync_engine) as session:
        p = session.execute(
            select(PromiseModel).where(PromiseModel.promise_id == test_promise_id)
        ).scalar_one()

        # Update promise fields
        p.title = updated_title
        p.status = "PAID"

        # Add Payment
        now = datetime.now(timezone.utc)
        payment = PaymentModel(
            promise_id=p.id,
            paypal_order_id=order_id,
            paypal_capture_id=capture_id,
            state="CAPTURED",
            amount_value=test_amount,
            currency_code="USD",
            buyer_approved=True,
            webhook_verified=True,
            payment_mode="PPCP Delayed Escrow",
            idempotency_key="IDEMP-VERIFY-001",
            raw_response={"status": "COMPLETED", "capture_id": capture_id},
            captured_at=now,
        )
        session.add(payment)

        # Add Evidence
        evidence = EvidenceModel(
            promise_id=p.id,
            evidence_id=evidence_id,
            kind="GIT_REPOSITORY",
            sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            title="Production Source Code Repository",
            source_uri="https://github.com/promisepay/verification-core",
            summary="Repository containing verified RFC 6962 Merkle engine and audit logs.",
            submitter_claim="All 2 requirements completely satisfied with zero warnings.",
        )
        session.add(evidence)

        # Update Audit Log
        audit_update = AuditLogModel(
            organization_id=org_id,
            promise_id=test_promise_id,
            actor_type="SYSTEM",
            actor_id="paypal_webhook_handler",
            event_type="PAYMENT_CAPTURED",
            summary=f"Payment {capture_id} captured successfully for ${test_amount:.2f}",
            before_hash="SHA256:a1b2c3d4e5f60718293a4b5c6d7e8f90",
            after_hash="SHA256:f9e8d7c6b5a403928172635445362718",
            metadata_json={"captureId": capture_id, "state": "CAPTURED"},
        )
        session.add(audit_update)
        session.commit()
        log(
            "UPDATE complete: Promise transitioned to PAID, payment captured, evidence linked, audit logged."
        )

    # Step 7: Independent Direct SQL Query Verification via Separate SQLite Connection
    log(
        "Step 7: Executing Direct SQL queries against SQLite database file to verify physical persistence..."
    )
    cursor.execute(
        "SELECT id, promise_id, title, status, amount_value, currency_code FROM promises WHERE promise_id = ?",
        (test_promise_id,),
    )
    row_promise = cursor.fetchone()
    log(f"SQL Direct Query (promises): {row_promise}")
    assert row_promise is not None
    assert row_promise[1] == test_promise_id
    assert row_promise[2] == updated_title
    assert row_promise[3] == "PAID"
    assert float(row_promise[4]) == test_amount

    cursor.execute(
        "SELECT id, paypal_order_id, paypal_capture_id, state, amount_value, buyer_approved, webhook_verified FROM payments WHERE paypal_order_id = ?",
        (order_id,),
    )
    row_payment = cursor.fetchone()
    log(f"SQL Direct Query (payments): {row_payment}")
    assert row_payment is not None
    assert row_payment[1] == order_id
    assert row_payment[2] == capture_id
    assert row_payment[3] == "CAPTURED"
    assert float(row_payment[4]) == test_amount
    assert row_payment[5] == 1  # True
    assert row_payment[6] == 1  # True

    cursor.execute(
        "SELECT id, evidence_id, kind, sha256, title FROM evidence WHERE evidence_id = ?",
        (evidence_id,),
    )
    row_evidence = cursor.fetchone()
    log(f"SQL Direct Query (evidence): {row_evidence}")
    assert row_evidence is not None
    assert row_evidence[1] == evidence_id
    assert row_evidence[2] == "GIT_REPOSITORY"

    cursor.execute(
        "SELECT id, promise_id, event_type, summary FROM audit_logs WHERE promise_id = ? ORDER BY created_at ASC",
        (test_promise_id,),
    )
    rows_audit = cursor.fetchall()
    log(f"SQL Direct Query (audit_logs count={len(rows_audit)}):")
    for ra in rows_audit:
        log(f"  - [{ra[2]}] {ra[3]}")
    assert len(rows_audit) >= 2

    # Column count and schema inspection
    cursor.execute("PRAGMA table_info(promises);")
    columns_promises = [r[1] for r in cursor.fetchall()]
    log(
        f"Table 'promises' verified with {len(columns_promises)} columns: {', '.join(columns_promises)}"
    )

    cursor.execute("PRAGMA table_info(payments);")
    columns_payments = [r[1] for r in cursor.fetchall()]
    log(
        f"Table 'payments' verified with {len(columns_payments)} columns: {', '.join(columns_payments)}"
    )

    conn_raw.close()
    log("=== COMPREHENSIVE DATABASE VERIFICATION COMPLETED SUCCESSFULLY ===")


if __name__ == "__main__":
    verify_database()
