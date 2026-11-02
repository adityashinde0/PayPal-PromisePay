# Product requirements — PromisePay MVP

## Product statement

PromisePay creates an explainable proof-of-outcome lifecycle around a PayPal payment. It is not escrow, an insurer, a marketplace, a logistics system, or a replacement for PayPal disputes.

## Users and jobs

| User | Job | Success signal |
| --- | --- | --- |
| Buyer | Understand what was promised and whether submitted evidence supports it | Can see each requirement, evidence, reasoning, and next step |
| Seller / merchant | Define a clear outcome and submit verifiable evidence | Knows required proof before starting fulfillment |
| Operations reviewer | Resolve ambiguity consistently | Can inspect the complete Promise Graph and record a decision |
| Demo evaluator | Test an actual PayPal + AI product | Can complete a Sandbox payment and see verification change the ledger |

## Primary user story

As a buyer of a website delivery, I can review a structured promise before paying, make a PayPal Sandbox payment, inspect evidence submitted by the seller, and understand why PromisePay says each requirement is verified, partial, unsupported, or needs review.

## Functional requirements

1. Create a Promise from free text plus amount/currency/category; return an immutable public-safe Promise ID.
2. Use AI to produce a schema-valid structured promise and verification plan; allow the merchant to edit and approve it before checkout.
3. Create and capture a real PayPal Sandbox Order linked to the Promise ID. The server sets amount and purchase data from stored promise data, never browser input.
4. Persist verified PayPal webhook events and reconcile payment state with the capture response.
5. Accept evidence entries with type, source URL or storage reference, submitter, timestamp, checksum, and declared requirement links.
6. Verify evidence per requirement and render: result, confidence band, evidence used, reasoning, and gaps.
7. Produce only three user-visible outcome states: `COMPLETE`, `REVIEW_REQUIRED`, `OUTCOME_NOT_VERIFIED`.
8. Record a human/business decision for any refund recommendation; optionally execute a permitted Sandbox refund after explicit confirmation.
9. Provide a Promise Ledger with AG Grid: Promise ID, category, amount, payment state, outcome, AI confidence, and drill-down action.
10. Preserve append-only audit events for material changes.

## Demonstration categories

| Category | Required promise elements | MVP evidence | Automated analysis boundary |
| --- | --- | --- | --- |
| Digital project | responsive site, auth, catalog, cart, deployment | live URL, Git repository URL, screenshots | Check reachability and evidence alignment; do not certify security/accessibility/perfection |
| Professional document | named document, required sections, minimum content | uploaded PDF/DOCX or extracted text | Check required sections/claims; do not attest legal, factual, or professional quality |
| Delivery / order | order reference, expected delivery, recipient | tracking reference, delivery status/confirmation | Assess supplied/adapter status; never guarantee physical condition or receipt |

## Non-functional requirements

- Explainability: every terminal verification includes cited evidence IDs and missing items.
- Reliability: payment actions use idempotency keys; webhooks are deduplicated.
- Security: secrets are server-side; raw webhook body is retained only as policy permits and never logged with secrets.
- Accessibility: keyboard-operable workflow, labels, status not conveyed by color alone.
- Performance target: p95 normal API reads under 500 ms excluding AI work; verification is asynchronous with visible progress.
- Observability: correlation ID and Promise ID on every API, AI run, PayPal operation, and audit event.

## Success metrics for hackathon MVP

- A judge can execute a complete Sandbox payment-to-outcome path in under 8 minutes.
- 100% of demo verification results show requirement-level evidence and reasoning.
- All PayPal events used in the demo pass signature validation or are explicitly identified as simulator events in test mode.
- No financial API call can originate from an AI tool call or from an unauthenticated browser request.

## Out of scope

- Holding customer funds, escrow, split payments, marketplaces, KYC, real dispute submission, recurring billing, production onboarding, guarantee of service/product quality, and independently fetching private third-party content.

## Acceptance scenarios

1. Website promise: AI extracts five deliverables, seller adds URL/repository/screenshots, verifier marks supported requirements and routes gaps to review.
2. Document promise: a document missing one requested section produces `REVIEW_REQUIRED`, names the missing section, and offers a request-evidence action.
3. Delivery promise: tracking evidence labeled delivered is treated as supporting evidence, not proof of product condition; a human can override the recommendation with reason.
4. Payment: a browser cannot alter the payable amount; capture IDs and resulting webhook events appear on the promise timeline.
