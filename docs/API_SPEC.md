# PromisePay API specification

Base path: `/api`. JSON payloads use `camelCase`; database columns use `snake_case`. All authenticated routes require a valid application JWT token or session and active organization membership. The service publishes full interactive OpenAPI documentation from FastAPI at `/docs` and the raw schema at `/openapi.json`.

## Conventions

- **Idempotency**: Send `Idempotency-Key: <UUID>` on every state-changing payment or resolution request.
- **Resource Identifiers**: Promise IDs are public-facing formatted strings (`PP-XXXX-YYYY`); internal database UUIDs are never exposed in buyer/seller UIs.
- **Error Contract**: Structured standard error envelope:
  ```json
  {
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Amount must be strictly positive.",
      "requestId": "req_8f72a1b9",
      "details": []
    }
  }
  ```
- **Pagination**: Standard cursor pagination via `?cursor=<id>&limit=50`. Ledger filtering and sorting are evaluated server-side.
- **Financial Precision**: Monetary amounts use ISO 4217 currency codes and fixed decimal strings to prevent IEEE-754 float rounding errors:
  ```json
  { "currencyCode": "USD", "value": "500.00" }
  ```

---

## 1. Authentication Router (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user by email, verifying password or test credentials, and returns an HMAC-SHA256 signed JWT token.
- **Request Body**:
  ```json
  { "email": "buyer@example.com", "password": "password123" }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "buyer@example.com",
      "displayName": "Demo Buyer",
      "role": "BUYER",
      "organizationId": "org_paypal_demo"
    }
  }
  ```

### `POST /api/auth/signup`
Registers a new tenant organization and primary administrator/buyer user.
- **Request Body**:
  ```json
  {
    "email": "merchant@store.com",
    "password": "SecurePassword123!",
    "displayName": "Merchant Joe",
    "organizationName": "Joe's Dev Studio",
    "role": "SELLER"
  }
  ```
- **Response `201 Created`**: Returns auth token and created user/organization IDs.

### `POST /api/auth/switch-role`
Allows demo evaluators and developers to switch active RBAC personas (`BUYER`, `SELLER`, `REVIEWER`, `ADMIN`) instantly without clearing local storage.
- **Request Body**:
  ```json
  { "role": "REVIEWER" }
  ```
- **Response `200 OK`**: Returns updated JWT containing the new role claim.

### `GET /api/auth/me`
Retrieves profile and organization metadata for the currently authenticated caller.

---

## 2. Promises Router (`/api/promises`)

### `POST /api/promises`
Creates a draft promise from natural language agreement text, assigning a canonical public ID (`PP-XXXX-YYYY`) and initiating requirement extraction.
- **Request Body**:
  ```json
  {
    "category": "DIGITAL_PROJECT",
    "title": "Responsive E-commerce Web App",
    "promiseText": "Build a responsive Next.js store with Stripe/PayPal checkout, 95+ Lighthouse score, and Vercel deployment.",
    "amount": { "currencyCode": "USD", "value": "1200.00" },
    "merchantOrderRef": "ORD-2026-99"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "promiseId": "PP-8F72X-2026",
    "status": "DRAFT",
    "title": "Responsive E-commerce Web App",
    "category": "DIGITAL_PROJECT",
    "amount": { "currencyCode": "USD", "value": "1200.00" },
    "version": 1
  }
  ```

### `GET /api/promises`
Primary AG Grid ledger endpoint. Supports query filtering by `status`, `category`, `paymentState`, `q` (free-text search), `cursor`, and `limit`.

### `GET /api/promises/{promiseId}`
Returns the comprehensive Promise Graph projection: approved version snapshot, atomic requirements, payment state, submitted evidence list, latest verification run, active resolution cases, and audit timeline.

### `PATCH /api/promises/{promiseId}`
Edits draft requirements or financial values prior to confirmation. Permitted only when `status` is `DRAFT` or `READY_FOR_PAYMENT`.

### `POST /api/promises/{promiseId}/confirm`
Freezes draft requirements and moves the promise to `READY_FOR_PAYMENT`. Creates an immutable `promise_versions` record.
- **Response `200 OK`**: Returns confirmed promise graph with `status: "READY_FOR_PAYMENT"`.

### `POST /api/promises/{promiseId}/cancel`
Aborts an unfulfilled promise with a required cancellation reason.
- **Request Body**:
  ```json
  { "reason": "Mutual agreement between buyer and seller to terminate project." }
  ```
- **Response `200 OK`**: Transitions promise to `CANCELLED`.

### `POST /api/promises/partner-referrals`
Integrates with PayPal Complete Payments (PPCP) Partner Referrals API to generate merchant onboarding links for delayed escrow disbursement.
- **Response `200 OK`**: Returns `{ actionUrl: "https://www.sandbox.paypal.com/bizsignup/partner/entry?referralToken=..." }`.

### `GET /api/promises/merchants/{merchantId}/status`
Polls PayPal Partner Referrals API to verify whether a seller has completed merchant onboarding and granted payment permissions.

### `GET /api/promises/templates/{category}`
Returns pre-configured atomic requirement templates for `DIGITAL_PROJECT`, `PROFESSIONAL_DOCUMENT`, and `DELIVERY`.

---

## 3. Payments & Escrow Router (`/api/promises/{id}/...`)

### `POST /api/promises/{promiseId}/payment-orders`
Creates a PayPal Sandbox Orders v2 order linked to the confirmed promise amount. Client may not supply an amount or modify purchase units.
- **Request Headers**: `Idempotency-Key: <UUID>`
- **Response `201 Created`**:
  ```json
  {
    "promiseId": "PP-8F72X-2026",
    "paypalOrderId": "5O190127TN364715T",
    "status": "ORDER_CREATED"
  }
  ```

### `POST /api/promises/{promiseId}/payment-orders/{paypalOrderId}/capture`
Captures an approved PayPal order. Validates order ownership against the promise and records capture ID.
- **Request Headers**: `Idempotency-Key: <UUID>`
- **Response `200 OK`**:
  ```json
  {
    "promiseId": "PP-8F72X-2026",
    "paypalOrderId": "5O190127TN364715T",
    "paypalCaptureId": "7AB12345CD678901E",
    "status": "COMPLETED",
    "paymentState": "CAPTURED",
    "disbursementHold": true
  }
  ```

### `POST /api/promises/{promiseId}/payout`
Releases delayed disbursement escrow to the seller via PayPal Payouts API once requirements are verified.
- **Request Headers**: `Idempotency-Key: <UUID>`
- **Response `200 OK`**:
  ```json
  {
    "payoutBatchId": "BATCH-2026-00412",
    "batchStatus": "SUCCESS",
    "amount": { "currencyCode": "USD", "value": "1200.00" },
    "recipientEmail": "seller@example.com"
  }
  ```

---

## 4. Webhooks Router (`/api/webhooks`)

### `POST /api/webhooks/paypal`
Public endpoint accepting PayPal webhook notifications (`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `CUSTOMER.DISPUTE.CREATED`).
- **Security**: Verifies raw request bytes and PayPal signature headers (`PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-TRANSMISSION-TIME`) via postback to `/v1/notifications/verify-webhook-signature`.
- **Deduplication**: Inserts unique `paypal_event_id` into `paypal_events`. Duplicate events return `200 OK` without re-processing.
- **Response `200 OK`**: `{ "status": "PROCESSED", "eventId": "WH-..." }`.

---

## 5. Evidence Management Router (`/api/promises/{id}/evidence`)

### `GET /api/promises/{promiseId}/evidence`
Lists all submitted deliverables, metadata, SHA-256 hashes, and download links for the promise.

### `POST /api/promises/{promiseId}/evidence`
Registers a live deliverable URL, Git repository reference, or tracking code:
```json
{
  "kind": "URL_SNAPSHOT",
  "sourceUri": "https://demo-ecommerce.vercel.app",
  "title": "Production Deployment URL",
  "requirementIds": ["REQ-1", "REQ-3"],
  "summary": "Live staging environment with responsive layout."
}
```

### `POST /api/promises/{promiseId}/evidence/upload-intents`
Authorizes a file upload, generating an `evidenceId` and pre-signed storage URL.
```json
{
  "filename": "specification_audit.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 2048576,
  "requirementIds": ["REQ-2"]
}
```

### `PUT /api/promises/{promiseId}/evidence/uploads/{evidenceId}`
Uploads raw file binary streams to a pre-authorized upload intent. Validates content length and computes SHA-256 digest on ingestion.

### `POST /api/promises/{promiseId}/evidence/files`
Multipart form direct upload supporting instant file ingestion, MIME type verification, and automatic SHA-256 checksumming.

### `GET /api/promises/{promiseId}/evidence/{evidenceId}/download`
Streams authorized evidence binary artifacts from private Supabase Object Storage to authenticated users.

---

## 6. Verification Engine Router (`/api/promises/{id}/verifications`)

### `POST /api/promises/{promiseId}/verifications`
Enqueues an asynchronous verification job evaluating submitted deliverables against approved requirements.
- **Response `202 Accepted`**:
  ```json
  {
    "runId": "run_9a8b7c6d-5e4f-3a2b-1c0d-e2f4a6b8c0d2",
    "status": "PENDING",
    "promiseId": "PP-8F72X-2026",
    "queuedAt": "2026-11-05T12:00:00Z"
  }
  ```

### `GET /api/promises/{promiseId}/verifications`
Returns historical list of all verification runs executed for the promise.

### `GET /api/promises/{promiseId}/verifications/{runId}`
Polls verification status and retrieves atomic requirement evaluation results:
```json
{
  "runId": "run_9a8b7c6d-5e4f-3a2b-1c0d-e2f4a6b8c0d2",
  "status": "COMPLETE",
  "outcome": "COMPLETE",
  "overallConfidence": 0.92,
  "results": [
    {
      "requirementId": "REQ-1",
      "status": "VERIFIED",
      "confidence": 0.95,
      "evidenceIds": ["ev_c7d8e9f0"],
      "reasoning": "Headless crawler verified responsive layout across 375px and 1440px viewports with valid DOM tree.",
      "missingInformation": []
    }
  ]
}
```

---

## 7. Resolution & Disputes Router (`/api/...`)

### `POST /api/promises/{promiseId}/resolution-cases`
Opens a formal review case from a verification run when requirements are ambiguous or disputed.
- **Request Body**:
  ```json
  {
    "verificationRunId": "run_9a8b7c6d",
    "reason": "Seller disputes partial verification on cart functionality."
  }
  ```

### `GET /api/promises/{promiseId}/resolution-cases`
Lists all resolution cases associated with the given promise.

### `GET /api/resolution-cases/{caseId}`
Retrieves detailed case workspace, evidence docket, and reviewer notes.

### `POST /api/resolution-cases/{caseId}/decisions`
Records an authorized reviewer's binding determination (`APPROVE_FULFILLMENT`, `APPROVE_REFUND`, `PARTIAL_REFUND`, `REJECT_CLAIM`).
- **Request Body**:
  ```json
  {
    "decision": "APPROVE_REFUND",
    "reason": "Critical cart checkout failure confirmed by multiple crawl attempts.",
    "refundAmount": 1200.00
  }
  ```

### `POST /api/resolution-cases/{caseId}/refunds`
Executes a PayPal Sandbox refund via Payments v2 (`POST /v2/payments/captures/{id}/refund`) following an approved refund decision.
- **Request Headers**: `Idempotency-Key: <UUID>`
- **Response `200 OK`**: `{ "paypalRefundId": "9CD12345...", "status": "COMPLETED" }`.

---

## 8. Dispute Defense Dossiers & PayPal Customer Disputes (`/api/disputes`)

### `GET /api/promises/{promiseId}/dispute-defense-dossier`
Assembles and returns a complete, cryptographically sealed Dispute Defense Dossier containing the frozen evidence manifest, RFC 6962 Merkle tree root hash, inclusion proofs, and operator transparency log proof.
- **Response `200 OK`**:
  ```json
  {
    "promiseId": "PP-8F72X-2026",
    "merkleRoot": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "transparencyLogProof": {
      "standard": "RFC 6962 Append-Only Cryptographic Transparency Log",
      "logId": "promisepay.transparency.paypal-enterprise",
      "treeSize": 1048576,
      "entryHash": "5a4f3b2c1d...",
      "timestampEpochMs": 1793880000000,
      "legalNonRepudiation": "CONFIRMED"
    },
    "evidenceDocket": [
      {
        "evidenceId": "ev_c7d8e9f0",
        "sha256": "8a3e7b1c...",
        "inclusionProof": "PP-PROOF-5a4f3b2c1d-9e8d7c"
      }
    ]
  }
  ```

### `GET /api/disputes`
Retrieves buyer disputes from PayPal Customer Disputes v1 API (`GET /v1/customer/disputes`).

### `GET /api/disputes/{disputeId}`
Fetches dispute status, dispute amount, reason, and dispute life cycle stage directly from PayPal.

### `POST /api/disputes/{disputeId}/submit-dossier`
Transmits the sealed Dispute Defense Dossier directly to PayPal's evidence submission endpoint (`POST /v1/customer/disputes/{id}/provide-evidence`).
- **Response `200 OK`**: `{ "status": "SUBMITTED", "dossierId": "DOS-2026-091" }`.

---

## 9. Realtime SSE Events Router (`/api/promises/{id}/events`)

### `GET /api/promises/{promiseId}/events`
Opens a persistent HTTP Server-Sent Events (SSE) stream (`text/event-stream`). Emits real-time state changes for promise status, evidence scans, verification progress, and payment capture events.
- **Format**:
  ```text
  event: PROMISE_UPDATED
  data: {"promiseId": "PP-8F72X-2026", "status": "VERIFYING", "timestamp": "2026-11-05T12:00:05Z"}
  ```

### `POST /api/promises/{promiseId}/events`
Internal/service endpoint to broadcast state update events to connected SSE client streams.

---

## 10. Health, Metrics & Demo Administration Router

### `GET /health` or `GET /api/health`
Standard Kubernetes/container liveness probe returning `{ "status": "healthy", "service": "promisepay-api" }`.

### `GET /health/detailed` or `GET /api/health/detailed`
Deep diagnostic check inspecting connectivity to PostgreSQL, Redis worker queues, PayPal Sandbox API, and Google Gemini endpoints.

### `GET /metrics` or `GET /api/metrics`
Prometheus-formatted operational metrics tracking HTTP request latency, active verification runs, DLP card scrubbing counts, and PayPal webhook postback verification outcomes.

### `POST /demo/reset` or `POST /api/demo/reset`
Idempotent demo reset utility. Clears transient evaluation runs and resets promises to pre-seeded state for hackathon judges and evaluation walkthroughs.

### `GET /api/config`
Returns public runtime configuration (PayPal Sandbox client ID, supported currencies, active environment mode) without exposing credentials.
