# PromisePay API specification

Base path: `/api`. JSON uses `camelCase`; database fields may use `snake_case`. All authenticated routes require a valid application session and organization membership. The service publishes OpenAPI from FastAPI at `/docs` and `/openapi.json`.

## Conventions

- Send `Idempotency-Key: <UUID>` on every state-changing payment or resolution request.
- Resource identifiers: Promise IDs are public-facing (`PP-XXXX-YYYY`); internal UUIDs are never required in the UI.
- Errors: `{ "error": { "code", "message", "requestId", "details?" } }`.
- Pagination: cursor-based `?cursor=&limit=50`; ledger filtering is server-side.
- Money: ISO 4217 code and decimal string, never float: `{ "currencyCode": "USD", "value": "500.00" }`.

## Promises

### `POST /promises`

Creates a draft, invokes extraction asynchronously or returns a template, and assigns a Promise ID.

```json
{
  "category": "digital_project",
  "title": "E-commerce website",
  "promiseText": "Deliver a responsive site with authentication, catalog, cart, and deployment.",
  "amount": { "currencyCode": "USD", "value": "500.00" },
  "merchantOrderRef": "DEMO-1001"
}
```

Returns `201` with `{ promiseId, status: "DRAFT", extractionStatus }`.

### `GET /promises/{promiseId}`

Returns the graph projection: approved requirement version, payment summary, evidence summary, latest verification, resolution status, and audit-safe timeline.

### `PATCH /promises/{promiseId}`

Only permitted in `DRAFT` or `READY_FOR_PAYMENT`; creates a new version. Confirmation moves the promise to `READY_FOR_PAYMENT`.

### `GET /promises`

Ledger endpoint. Supports `status`, `category`, `paymentState`, `outcome`, `q`, `sort`, `cursor`, and `limit`. Response includes stable AG Grid row IDs.

## Payments

### `POST /promises/{promiseId}/payment-orders`

Creates a PayPal Sandbox Orders v2 order from the server-side confirmed promise. Client may supply no amount, payee, or arbitrary purchase-unit data.

Response `201`:

```json
{ "promiseId": "PP-8F72X-2026", "paypalOrderId": "5O190127TN364715T", "status": "ORDER_CREATED" }
```

### `POST /promises/{promiseId}/payment-orders/{paypalOrderId}/capture`

Captures an approved order after validating it belongs to the specified promise and has not been captured. Response includes `captureId`, state, and correlation ID. The caller must treat webhook reconciliation as authoritative for eventual state.

### `POST /webhooks/paypal`

Unauthenticated public endpoint. Reads exact raw bytes, verifies PayPal signature before processing, deduplicates event ID, and returns a safe 2xx acknowledgement. It never trusts a client-declared webhook event.

## Evidence

### `POST /promises/{promiseId}/evidence/upload-intents`

Validates type/size and returns a short-lived signed upload URL. The upload service creates an `evidenceId`; submission remains pending scan/extraction.

### `POST /promises/{promiseId}/evidence`

Registers a URL, tracking reference, repository reference, or completed upload:

```json
{
  "kind": "live_url",
  "source": "https://example.test",
  "requirementIds": ["req_website_responsive"],
  "submitterClaim": "The live deployment contains the responsive storefront."
}
```

Server records provenance; it does not accept `submitterClaim` as truth.

### `GET /promises/{promiseId}/evidence`

Returns evidence metadata and safe view/download links authorized for the viewer.

## Verification

### `POST /promises/{promiseId}/verifications`

Queues a new run against a frozen promise version and selected evidence versions. Duplicate active requests return the existing run.

### `GET /promises/{promiseId}/verifications/{runId}`

Returns `QUEUED`, `RUNNING`, `COMPLETED`, or `FAILED`; after completion returns per-requirement results:

```json
{
  "outcome": "REVIEW_REQUIRED",
  "results": [{
    "requirementId": "req_cart",
    "status": "PARTIALLY_VERIFIED",
    "confidence": 0.74,
    "evidenceIds": ["ev_123"],
    "reasoning": "The screenshot shows a cart page, but no evidence shows checkout interaction.",
    "missingInformation": ["Functional checkout demonstration"]
  }]
}
```

## Resolution

### `POST /promises/{promiseId}/resolution-cases`

Opens a case from a verification run. Any buyer, seller, or reviewer can request review according to organization policy.

### `POST /resolution-cases/{caseId}/decisions`

Reviewer-only. Records `MARK_COMPLETE`, `REQUEST_EVIDENCE`, `OPEN_REVIEW`, or `RECOMMEND_REFUND`, plus a mandatory human reason. This does not move money.

### `POST /resolution-cases/{caseId}/refunds`

Reviewer/authorized business role only, `Idempotency-Key` required. Preconditions: captured payment, supported currency/amount, confirmed decision, and no incompatible refund pending. Calls PayPal's captured-payment refund API only after all checks pass.

## Admin and audit

- `GET /promises/{promiseId}/audit-log` — role-limited append-only events.
- `GET /healthz` — liveness, no secrets.
- `GET /readyz` — dependency readiness, never exposed publicly without protection in production.

## Webhook event policy

Store verified raw headers/body digest, PayPal event ID/type/time, verification result, processing status, and linked payment. Unknown but verified events are retained as `IGNORED`, not treated as errors. Unverified events are quarantined and alert operational staff; they cannot alter a promise.
