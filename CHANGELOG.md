# Changelog

All notable changes to PromisePay are recorded here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and semantic versioning after the MVP.

## [Unreleased]

### Added

- **Phase 4 (AI Verification Engine & Explainability UX)**:
  - Explainable AI verification service (`promisepay_api/services/verifier.py`) with frozen evidence manifest hashing, strict anti-injection sanitization, and deterministic pre-checks.
  - Verification run queue and endpoints (`POST /promises/{id}/verifications`, `GET /promises/{id}/verifications/{runId}`, `GET /promises/{id}/verifications`).
  - Deterministic guards: Hallucinated evidence ID rejection, uncorroborated claim confidence clamping ($\le 0.59$), and fail-closed human review policy (`COMPLETE`, `REVIEW_REQUIRED`, `OUTCOME_NOT_VERIFIED`).
  - Background worker async verification runner (`execute_verification_job`).
  - Next.js Explainable AI Verification Dossier UI with per-requirement status pills, confidence meters, cited proof chips, gap alerts, and limitations transparency.
  - Complete test suite for fully supported, incomplete, contradictory, and hostile prompt-injection evidence (`services/api/tests/test_verifications.py`).
- **Phase 3 (Evidence & Provenance Management)**:
  - Pre-signed upload intents with 15-minute expiry, size limits (25MB max), and MIME allow-list (`POST /promises/{id}/evidence/upload-intents`).
  - Evidence registration endpoint with requirement linking and submitter claim capture (`POST /promises/{id}/evidence`).
  - Direct multipart file upload endpoint (`POST /promises/{id}/evidence/files`) and secure download endpoint (`GET /promises/{id}/evidence/{evidenceId}/download`) with defensive HTTP headers (`nosniff`, `default-src 'none'`).
  - SSRF protection guard against local, loopback, link-local, and private RFC-1918 networks (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`).
  - Cryptographic SHA-256 fingerprinting and structured provenance logging.
  - Interactive Evidence Vault & Submission UI in the Next.js frontend (`apps/web/src/app/promises/[id]/page.tsx`).
  - Background worker evidence integrity scanner (`scan_evidence`).
  - 100% test coverage with comprehensive negative security tests.
- **Phase 2 (PayPal Sandbox Integration)**:
  - PayPal Orders v2 integration with server-enforced pricing.
  - Raw body signature-verified webhook ingestion (`/webhooks/paypal`).
  - Transactional state updates and audit trail.
- **Phase 1 (Promise Core)**:
  - Atomic requirement models and category templates.
  - Structured promise versioning and confirmation workflow.
- **Phase 0 (Foundations)**:
  - Monorepo structure, FastAPI backend, Next.js web client, Supabase schema migrations, CI pipelines.
