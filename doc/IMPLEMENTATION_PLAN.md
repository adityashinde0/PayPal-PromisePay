# Implementation plan

## Delivery order

| Phase | Outcome | Done when |
| --- | --- | --- |
| 0. Foundations | Repository, CI, environments, schema migrations | `.env.example`, health endpoint, lint/type/test commands, no secrets committed |
| 1. Promise core | Promise creation and editable AI extraction | A user can create, review, version, and view a promise |
| 2. PayPal Sandbox | Real create/approve/capture + webhooks | A Sandbox buyer payment appears on a Promise Graph and in the ledger |
| 3. Evidence | Files/URLs/references with provenance | Evidence is safely stored and linked to requirements |
| 4. AI verification | Explainable, async requirement analysis | Every result cites evidence IDs, gaps, confidence, and model/prompt version |
| 5. Resolution | Human-gated action recommendation | Reviewer can decide and, in Sandbox, optionally initiate a refund |
| 6. Polish | AG Grid, accessibility, observability, demo | Fresh-clone judge path is documented and rehearsed |

## Sprint-sized task breakdown

### 0. Foundations

- Create `apps/web`, `services/api`, `services/worker`, `infra`, `docs`, and a root task runner.
- Add formatting, linting, type checks, migration command, unit tests, secret scanning, and dependency audit to CI.
- Add Supabase migrations and development seed data that contains no real personal data.

### 1. Promise core

- Implement `POST /api/promises` and `GET /api/promises/{promise_id}`.
- Define Pydantic request/response models and JSON schemas shared with the web app through generated OpenAPI types.
- Implement template defaults for digital project, document, and delivery. Require explicit merchant confirmation before payment.

### 2. Payment core

- Build a PayPal REST client using OAuth token exchange and the Sandbox base URL.
- Use Orders v2 with `intent: CAPTURE`; create purchase units from server-side confirmed promise data.
- Load the current PayPal JavaScript SDK v6 via the documented React integration. Return only a PayPal order ID to the client.
- Persist `PayPal-Request-Id` and protect create/capture from duplicate operations.
- Subscribe the Sandbox app to selected event types: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED` (validate exact supported names during dashboard setup).
- Verify raw-body webhook signature, persist event ID once, update payment state transactionally, and return 2xx only after durable acceptance.

### 3. Evidence

- Generate signed upload URLs; server validates metadata and queues scanning/extraction.
- Store SHA-256 checksum, source URL/hostname, submitted timestamp, uploader identity, and extraction version.
- Allow manual statement of what each item proves; never treat it as verified fact.

### 4. AI verification

- Build extractor, plan generator, analyzer, and resolution-assistant functions with strict schemas.
- Feed the model only normalized, approved requirements plus selected evidence excerpts.
- Implement deterministic guards: schema validation, evidence reference validation, confidence clamping, unsupported-claim rejection, and a fail-closed review state.
- Add test fixtures for fully supported, incomplete, contradictory, and hostile evidence.

### 5. Resolution

- Build a case timeline and reviewer decision screen.
- Add a confirm dialog requiring reason and case ID before a refund request.
- Enforce role and state checks on refund; use a fresh idempotency key and record PayPal response/audit event.

### 6. Submission readiness

- Seed three reusable demo promises and Sandbox test-account instructions.
- Export public Postman collection; document OpenAPI client generation with APIMatic only if actually used.
- Prepare the under-three-minute end-to-end path in [DEMO_GUIDE.md](DEMO_GUIDE.md).

## Adapt, do not blindly copy

- Adapt the official [Next.js Checkout guide](https://developer.paypal.com/guides/nextjs-checkout) for SDK v6 component wiring. Replace its Next server actions with calls to the FastAPI payment service.
- Adapt the official [Express example](https://github.com/paypaldev/example-node-express) for the secure price-on-server pattern, `create → approve → capture`, and environment organization. Do not transplant its Express routes into FastAPI.
- Implement webhooks from the current [official guide](https://developer.paypal.com/api/rest/webhooks/rest/); preserve the raw body, use the saved webhook ID, and write your own tested FastAPI adapter.
- Use the official API specification/Postman collection for payload examples, but keep PromisePay's public API contract under version control in this repository.

## Definition of done

A feature is done only if it has authorization checks, input validation, audit logging where material, unit tests, failure-state UI, and documentation updates. Payment or refund features additionally require sandbox integration tests and manual idempotency/retry testing.
