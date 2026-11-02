# Architecture

## System shape

```text
Buyer / Seller / Reviewer
          │
Next.js web app ─────────────── AG Grid Promise Ledger
          │ HTTPS / session token
          ▼
FastAPI
 ├─ Promise service        ├─ Evidence service
 ├─ Payment service        ├─ Verification orchestrator
 ├─ Resolution service     └─ Audit service
          │                  │
          ▼                  ▼
Supabase Postgres + Storage   LLM provider (JSON schema response)
          ▲
PayPal Orders / Payments / Webhooks
```

## Trust boundaries

| Boundary | Trusted inputs | Required control |
| --- | --- | --- |
| Browser → API | authenticated user input only | authorization, schema validation, CSRF/session protection, rate limits |
| API → PayPal | server-held credentials and calculated amount | OAuth, idempotency, allow-listed base URL, response validation |
| PayPal → webhook | raw HTTPS request | signature verification before parse/process; event deduplication |
| API → AI | minimized promise/evidence excerpts | schema-constrained output, prompt/version logging, no tools that can move money |
| Object storage → verifier | scanned, provenance-recorded files | MIME/size checks, malware scan, signed URLs, extraction sandbox |

## Core sequence

1. Merchant enters a promise. API assigns `PP-...`, extracts requirements and creates a verification plan.
2. Merchant confirms edited requirements. API records a promise version.
3. Buyer initiates checkout. API reads the confirmed promise amount, creates a PayPal Order with a `custom_id` containing only the Promise ID, and returns order ID to the frontend SDK.
4. After buyer approval, API captures the PayPal Order and stores returned order/capture data. A verified webhook reconciles the state.
5. Seller submits evidence. The API stores metadata, content checksum, and immutable evidence version.
6. A worker verifies evidence against the approved plan and writes requirement-level results.
7. Resolution policy maps results to a recommendation. A reviewer can accept/override with a reason. Only this separate authorized action can call a PayPal refund endpoint.

## Promise Graph

The graph is modeled through relational links, not a graph database in the MVP:

```text
promise ← promise_version ← requirement ← verification_plan_item
   ├── payment ← paypal_event
   ├── evidence ← evidence_requirement
   ├── verification_run ← verification_result
   └── resolution_case ← resolution_decision
```

This allows transactional integrity, row-level authorization, and simple AG Grid queries. A graph projection endpoint can assemble the connected lifecycle for the UI.

## State machines

**Promise:** `DRAFT → READY_FOR_PAYMENT → PAYMENT_PENDING → PAID → FULFILLMENT → EVIDENCE_SUBMITTED → VERIFYING → COMPLETE | REVIEW_REQUIRED | OUTCOME_NOT_VERIFIED → RESOLVED`

**Payment:** `NOT_STARTED → ORDER_CREATED → APPROVED → CAPTURED | FAILED | CANCELLED → REFUND_PENDING → REFUNDED`

**Resolution:** `NONE → OPEN → DECISION_RECORDED → ACTION_PENDING → CLOSED`

State transitions are server-owned. Transitions are recorded in `audit_logs` and must meet preconditions defined in the API service.

## Deployment MVP

- Web: Next.js on Render static/web service.
- API: FastAPI container on Render web service.
- Worker: Render background worker only after asynchronous verification is implemented; inline background task is acceptable for the first local demo.
- Database/storage: Supabase project with separate development and demo environments.
- Required public endpoint: `POST /api/webhooks/paypal` over HTTPS.

## Scaling path

Use a message queue for verification, content extraction, retry policies, and outbound notifications. Keep the payment service synchronous and narrowly scoped. Do not share PayPal credentials with worker jobs that do not need them.
