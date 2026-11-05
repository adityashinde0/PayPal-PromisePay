# Testing strategy

PromisePay maintains an enterprise test pyramid spanning unit, integration, contract, security, and native cryptographic test suites. The automated test suite contains **102 passing tests** across Python FastAPI, the background worker, and the native Rust Merkle sealing crate.

## Test Pyramid & Execution Summary

```text
       ▲
      / \        Contract & E2E (PayPal Sandbox & Webhooks)
     /   \       -----------------------------------------
    /     \      Integration (FastAPI + Supabase DB + DLP + AI)
   /       \     -----------------------------------------------
  /         \    Unit Tests (Pydantic Schemas, Luhn Scrubber, Rust Merkle)
 /___________\   ---------------------------------------------------------
```

| Suite | Component | Framework | Test Count | Pass Rate | Execution Target |
| --- | --- | --- | :---: | :---: | --- |
| API Service | `services/api/` | Pytest + Pytest-Asyncio | 93 | 100% | `pytest services/api/tests/ -v` |
| Background Worker | `services/worker/` | Pytest + Pytest-Asyncio | 3 | 100% | `pytest services/worker/tests/ -v` |
| Cryptographic Engine | `crates/promisepay-verify/` | Cargo Test (Native Rust) | 6 | 100% | `cargo test --manifest-path crates/promisepay-verify/Cargo.toml` |
| **Total Test Suite** | **Entire Platform** | **Polyglot Python + Rust** | **102** | **100%** | **All 102 passing with 0 failures** |

---

## 1. API Service Test Suite (93 Tests)

Located in `services/api/tests/`, this suite validates endpoints, multi-judge AI verification, security guards, payment lifecycles, and data loss prevention:

### `test_ai_evaluation.py` (25 tests)
- **Adversarial Vector Ingestion**: 14 parameterized tests verifying `detect_hostile_input()` detects and blocks known prompt injections, system prompt overrides, developer mode exploits, roleplay bypasses, and SQL/XSS vectors.
- **Clean Input Acceptance**: Confirms normal business agreements pass hostile check without false positives.
- **Prompt Injection Defense**: Verifies `extractor.py` neutralizes hostile contract text.
- **PCI-DSS Luhn Algorithm**: Validates 13–19 digit credit card numbers and checks validity against Luhn checksum formulas.
- **DLP PII Scrubber**: Tests automated redaction of credit cards, SSNs, API tokens, and JWT credentials.
- **Confidence Clamping Policy**: Enforces the $\le 0.59$ cap on uncorroborated, single-assertion evidence.
- **Rule-Based Evaluator Fallback**: Confirms deterministic rule evaluation clamps claim-only submissions.
- **Zero-Evidence Degradation**: Asserts missing deliverables immediately yield $0.00$ confidence.
- **Multi-Judge Consensus Divergence**: Tests divergence detection between Gemini 1.5 Pro and Gemini 1.5 Flash, asserting `REVIEW_REQUIRED`.
- **Multimodal Document AI OCR**: Tests deterministic PDF/receipt text extraction and heading indexing.
- **Headless Crawler Viewport Capture**: Tests DOM heading extraction and responsive 800x480 viewport snapshots.
- **Deterministic Manifest Hashing**: Verifies SHA-256 evidence manifest digests remain bit-for-bit reproducible.

### `test_auth_and_security.py` (5 tests)
- **Fail-Closed Authentication**: Rejects unauthenticated requests to protected API routes with `401 Unauthorized`.
- **JWT Cryptographic Verification**: Verifies valid test bearer tokens allow authorized operations.
- **Hostile Input Scanner**: Verifies input sanitization filters adversarial inputs at the middleware boundary.
- **Webhook Postback Enforcement**: Enforces live PayPal signature verification (`verify-webhook-signature`).
- **Asynchronous Queueing**: Validates that verification requests queue cleanly returning `202 Accepted`.

### `test_dossier.py` (3 tests)
- **Dispute Defense Dossier Generation**: Validates compilation of RFC 6962 Merkle tree proofs, evidence dockets, and transparency log proofs.
- **Dossier Download Endpoint**: Asserts file streaming of JSON dossiers.
- **Dossier 404 Handling**: Verifies proper error envelope when querying non-existent promise dossiers.

### `test_enterprise_100.py` (8 tests)
- **Luhn Card Checksum**: Exercises valid/invalid Visa, Mastercard, and Amex numbers.
- **DLP PII Redaction**: Confirms PCI-DSS card masking and email/phone scrubbing.
- **Circuit Breaker Fallback**: Verifies circuit breaker trip and graceful fallback under simulated external API downtime.
- **In-Memory Rate Limiting**: Validates sliding window rate limiter prevents burst abuse.
- **PayPal Payouts Client**: Tests construction of PPCP delayed escrow payout requests.
- **Transparency Log Proof Generation**: Verifies HMAC-SHA256 signature and sequence anchoring.
- **Dossier Transparency Proof Inclusion**: Confirms dossier payload contains transparency metadata.
- **OpenTelemetry Header Propagation**: Asserts distributed trace headers (`traceparent`, `X-Correlation-ID`).

### `test_evidence.py` (6 tests)
- **Seeded Evidence Retrieval**: Verifies query of seeded demo evidence items.
- **Upload Intent Lifecycle**: Validates pre-signed upload intent generation and TTL expiry.
- **Upload Validation Guards**: Rejects oversized files (>50MB) and unauthorized MIME types.
- **Live URL Registration**: Asserts URL canonicalization and redirect chain metadata retention.
- **SSRF Protection Engine**: Blocks loopback (`127.0.0.1`), private RFC 1918 subnets, and AWS/GCP metadata endpoints (`169.254.169.254`).
- **Direct File Ingestion & Streaming**: Tests multipart upload and authenticated streaming download.

### `test_health.py` (7 tests)
- **Liveness Probes**: Tests `/health` and `/api/health`.
- **API Root Endpoint**: Verifies standard JSON metadata response at `/`.
- **Correlation ID Middleware**: Asserts unique `X-Correlation-ID` header injected on every response.
- **Detailed Subsystem Diagnostics**: Inspects live health of PostgreSQL, Redis, and PayPal connectivity.
- **Prometheus Metrics**: Asserts `/metrics` exposes request counters and latency histograms.
- **Demo State Reset**: Validates idempotent database re-seeding via `/demo/reset`.

### `test_payments.py` (8 tests)
- **Payment Precondition Checks**: Rejects payment orders on unconfirmed draft promises.
- **Orders v2 Create & Capture Lifecycle**: Tests complete sandbox order creation and capture.
- **Capture Mismatch Defense**: Rejects attempts to capture an order against an unrelated promise.
- **Invalid Webhook Signature Rejection**: Blocks forged webhook payloads missing valid PayPal transmission headers.
- **Webhook Deduplication**: Guarantees repeated webhook deliveries update state only once.
- **Sandbox Mock Disallowance**: Ensures simulated fallbacks are strictly prohibited outside demo mode.
- **Capture Failure Handling**: Surfaces non-sensitive PayPal API error messages.
- **Demo Mode Sandbox Fallback**: Validates controlled fallback execution when `DEMO_MODE=true`.

### `test_promises.py` (6 tests)
- **Promise Ledger Listing**: Tests AG Grid pagination and category filtering.
- **Category Templates**: Validates pre-seeded templates for `DIGITAL_PROJECT`, `PROFESSIONAL_DOCUMENT`, `DELIVERY`.
- **Promise Creation**: Tests promise creation and public ID assignment (`PP-XXXX-YYYY`).
- **Schema Validation Failure**: Asserts `422 Unprocessable Entity` on negative monetary values.
- **Lifecycle Edit & Confirmation**: Verifies draft editing and version freezing.
- **404 Boundary Handling**: Asserts `404 Not Found` on nonexistent promise queries.

### `test_resolutions.py` (6 tests)
- **Resolution Case Opening**: Validates opening a human review case from an ambiguous verification run.
- **Decision Justification Enforcement**: Rejects decisions without mandatory human rationale text.
- **Refund Precondition Human Gate**: Confirms refunds cannot execute without an approved reviewer decision.
- **Successful Sandbox Refund**: Tests Payments v2 capture refund execution with idempotency keys.
- **Complete Settlement Decision**: Validates closing cases with fulfillment approval.
- **Resolution Boundary Checks**: Asserts tenant isolation on case management.

### `test_rust_verifier.py` (4 tests)
- **Empty Merkle Root**: Validates SHA-256 digest on empty manifest.
- **Single Leaf Merkle Calculation**: Tests RFC 6962 domain-separated hashing on single item.
- **Deterministic Lexicographical Ordering**: Asserts canonical leaf ordering.
- **Dossier Sealing & Verification**: Tests end-to-end sealing and cryptographic verification.

### `test_v2_roadmap.py` (10 tests)
- **JWT Cryptographic Creation & Verification**: Validates token generation and signature verification.
- **Auth Router Login & Signup**: Exercises full registration and login flows.
- **RBAC Role Gating**: Confirms buyer cannot execute reviewer-only decisions.
- **Headless Scraper Deliverable Crawl**: Tests real deliverable crawling and DOM extraction.
- **Multimodal Document AI OCR**: Tests document OCR parsing.
- **Evidence Registration with Scraper**: Verifies URL submission auto-triggers crawler.
- **PayPal Partner Referrals**: Tests PPCP merchant onboarding link generation.
- **Real-Time SSE Event Stream**: Validates persistent Server-Sent Events connectivity.
- **PayPal Dispute Webhook & Auto-Dispatch**: Tests automatic dossier dispatch upon dispute creation.
- **Dispute Defense Dossier Download**: Validates sealed dossier retrieval.

### `test_verifications.py` (5 tests)
- **Verification Demo Workflow**: Tests end-to-end verification of pre-seeded demo promise.
- **Missing Evidence Review Routing**: Asserts partial evidence routes to `REVIEW_REQUIRED`.
- **Hostile Prompt Injection Defense**: Validates prompt sanitization during live verification.
- **Claim-Only Confidence Clamping**: Enforces $\le 0.59$ cap on uncorroborated assertions.
- **Verification Run Retrieval**: Tests retrieval and status polling.

---

## 2. Background Worker Test Suite (3 Tests)

Located in `services/worker/tests/`, this suite verifies asynchronous job handling and evidence scanning:
- `test_worker_initialization`: Validates worker queue configuration and Redis connectivity.
- `test_worker_scan_evidence`: Tests asynchronous virus scanning and MIME type verification.
- `test_worker_execute_verification_job`: Verifies background execution of multi-judge verification jobs.

---

## 3. Cryptographic Merkle Crate Test Suite (6 Tests)

Located in `crates/promisepay-verify/src/`, this native Rust suite verifies RFC 6962 mathematical correctness:
- `merkle::tests::test_deterministic_ordering`: Verifies lexicographical leaf sorting prevents collision attacks.
- `merkle::tests::test_single_leaf`: Verifies leaf hashing with `0x00` domain separation byte.
- `merkle::tests::test_tamper_detection`: Asserts any byte change in an evidence artifact alters the Merkle root.
- `merkle::tests::test_empty_manifest`: Validates empty manifest root computation.
- `dossier::tests::test_seal_and_verify_success`: Validates cryptographic sealing and inclusion proof verification.
- `dossier::tests::test_tamper_fails_verification`: Asserts tampered inclusion proofs fail verification.

---

## Quality Gates & Verification Commands

```bash
# 1. Run full API test suite (93 tests)
pytest services/api/tests/ -v

# 2. Run background worker test suite (3 tests)
pytest services/worker/tests/ -v

# 3. Run native Rust cryptographic suite (6 tests)
cargo test --manifest-path crates/promisepay-verify/Cargo.toml

# 4. Validate all Markdown GFM tables
python3 .agents/teamwork/teamwork_explorer_m1_iter2_3/validate_tables.py .

# 5. Validate all Markdown relative links
python3 .agents/teamwork/teamwork_explorer_m1_3/verify_links.py
```
