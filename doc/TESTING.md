# Testing strategy

## Test pyramid

| Layer | Scope | Required examples |
| --- | --- | --- |
| Unit | state machine, schemas, PayPal client request construction, policy engine | no client amount override; invalid result citation rejected; refund precondition failure |
| Integration | FastAPI + test Postgres/storage + mocked AI/PayPal HTTP | idempotency, RLS, evidence manifest freeze, webhook event persistence |
| Contract | PayPal Sandbox and OpenAPI contract | real create/approve/capture, response mapping, webhook verification path |
| End-to-end | browser + deployed demo | each category from promise through outcome; role-based resolution |
| Security | authz, secrets, webhooks, uploads, URL fetcher | forged/replayed events, cross-tenant access, SSRF, malware/malformed document, prompt injection |

## Payment test cases

1. API creates an order from stored confirmed amount; malicious request amount is ignored.
2. Approved Sandbox order captures once and records capture ID.
3. A repeated create/capture request with the same idempotency key is safe and returns the original logical result.
4. Browser cancellation, PayPal denial, timeout, and capture error surface useful non-sensitive states.
5. Verified capture/refund webhook is stored once; a duplicate delivery does not duplicate timeline or state.
6. Invalid signature causes no mutation. Simulator test events are labeled and do not masquerade as transaction events.
7. Refund requires an authorized reviewer, a recorded decision, captured payment, correct state, and an idempotency key.

## AI/evidence test cases

- Schema validation rejects a hallucinated evidence ID, unknown requirement, out-of-range confidence, and prose-only output.
- Complete and incomplete fixtures yield expected requirement/outcome statuses.
- Conflicting evidence and failed extraction produce `REVIEW_REQUIRED`.
- Prompt-injection text in a document cannot alter system instructions or trigger tools.
- URL scanner rejects private IPs, metadata endpoints, redirect-to-private flows, overlarge content, and unsupported MIME types.
- Explainability response always contains reason, evidence IDs (or explicit absence), limitations, and gaps.

## Quality gates

Before merge: formatter, linter, TypeScript/Python type check, unit/integration tests, migration check, secret scan, dependency audit, and API schema generation diff. Before demo release: deployed smoke test, PayPal Sandbox flow, webhook signature test, three category journeys, accessibility keyboard path, and a fresh-clone setup rehearsal.

## Fixture discipline

Use synthetic buyers, sellers, promise text, files, tracking numbers, and screenshots. Never commit PayPal credentials, real personal data, bank/payment information, or private third-party documents. Store reproducible fixture manifests and expected verification results under version control.

## Observability assertions

Each testable state-changing path emits a correlation ID and relevant Promise ID. Logs assert that secrets and raw sensitive evidence are redacted. Dashboards track webhook verification failures, verification failures, payment error rates, queue age, and duplicate-operation prevention.
