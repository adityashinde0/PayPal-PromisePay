# Product requirements — PromisePay

## Product statement

PromisePay is an enterprise-grade, non-custodial verifiable conditional payment platform built on PayPal Complete Payments (PPCP). It creates an explainable, cryptographically audited proof-of-outcome lifecycle around PayPal payments, combining delayed disbursement escrow, automated multi-judge AI verification, RFC 6962 Merkle tree sealing, and direct PayPal Customer Dispute defense dossier submission. All financial custody resides strictly with PayPal Inc. under its money transmitter and banking licenses.

## Users and jobs

| User | Job | Success signal |
| --- | --- | --- |
| Buyer | Understand what was promised, fund order with delayed escrow hold, and verify proof before release | Can inspect atomic requirements, audit evidence reasoning, and trigger gated reviews |
| Seller / merchant | Define clear deliverable specifications, onboard via PPCP, and submit verifiable evidence | Receives automated payouts upon milestone verification; protected by cryptographic dispute defense |
| Operations reviewer | Resolve ambiguity and adjudicate disputed claims with complete mathematical proof | Can inspect full Promise Graph, Merkle inclusion proofs, and record binding decisions |
| Demo evaluator | Evaluate end-to-end PayPal integration and autonomous multi-judge AI safety | Completes Sandbox checkout, triggers crawler/OCR verification, and observes real-time ledger transitions |

## Primary user story

As a buyer or enterprise purchasing a complex digital deliverable, I can review an AI-extracted structured promise before paying, authorize a PayPal Sandbox payment with delayed disbursement hold, inspect multimodal evidence submitted by the seller, observe real-time multi-judge AI verification, and rely on cryptographically sealed dispute dossiers if deliverables fail to satisfy agreed criteria.

## Functional requirements

1. **Promise Lifecycle Root**: Create a Promise from natural language agreement text and financial amounts; assign an immutable, public-safe identifier (`PP-XXXX-YYYY`).
2. **AI Requirement Extraction**: Utilize Gemini to parse agreements into atomic, testable requirements (`REQ-1`, `REQ-2`) and generated verification plans. Allow merchant confirmation before checkout.
3. **PayPal Orders v2 Integration**: Create and capture PayPal Sandbox orders linked via `custom_id` to the Promise ID. Server sets purchase units and amount; client cannot modify pricing.
4. **PPCP Delayed Disbursement Escrow**: Support programmatic disbursement holds within PayPal Complete Payments. Funds are held in PayPal's regulated infrastructure until verification completes, then disbursed via PayPal Payouts API.
5. **Durable Webhook Reconciliation**: Persist HMAC-SHA256 verified PayPal webhooks (`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `CUSTOMER.DISPUTE.CREATED`), deduplicating events to guarantee idempotency.
6. **Multimodal Evidence Ingestion**: Accept live URLs, GitHub repository references, tracking codes, and direct file uploads (PDF, DOCX, PNG) with SHA-256 integrity digests.
7. **Multi-Judge AI Consensus & DLP Pipeline**: Execute parallel verification through Gemini 1.5 Pro, Gemini 1.5 Flash, and an independent deterministic rule-based evaluator. Scrub credit cards via Luhn algorithm and mask PII. Enforce confidence clamping ($\le 0.59$) on judge divergence.
8. **Automated Deliverable Crawling & OCR**: Run headless Chromium to extract DOM structures and 800x480 viewport snapshots; use multimodal document AI for deterministic PDF receipts.
9. **Native Rust RFC 6962 Merkle Sealing**: Seal frozen evidence manifests into canonical Merkle tree roots using domain separation (`0x00` leaves, `0x01` interior nodes) and lexicographical ordering via `crates/promisepay-verify`.
10. **Automated PayPal Dispute Defense Dossiers**: Generate legal-grade dispute dossiers with RFC 6962 inclusion proofs and transparency log timestamp signatures, submitting them directly to PayPal Customer Disputes v1 API (`/v1/customer/disputes/{id}/provide-evidence`).
11. **Gated Resolution & Sandbox Refunds**: Enforce human authorization with mandatory justification for refunds. Execute PayPal Payments v2 refunds (`POST /v2/payments/captures/{id}/refund`) safely with idempotency tokens.
12. **Real-Time Event Streaming**: Provide Server-Sent Events (SSE) streaming live status updates to frontend clients.
13. **Enterprise AG Grid Ledger**: Present real-time promise ledger with filtering by status, payment state, outcome, category, and audit drill-down.
14. **Append-Only Audit Ledger**: Record tamper-evident audit logs with `before_hash` and `after_hash` state transitions.

## Demonstration categories

| Category | Required promise elements | MVP evidence | Automated analysis boundary |
| --- | --- | --- | --- |
| Digital project | responsive site, auth, catalog, cart, deployment | live URL, Git repository URL, screenshots | Check reachability and evidence alignment; do not certify security/accessibility/perfection |
| Professional document | named document, required sections, minimum content | uploaded PDF/DOCX or extracted text | Check required sections/claims; do not attest legal, factual, or professional quality |
| Delivery / order | order reference, expected delivery, recipient | tracking reference, delivery status/confirmation | Assess supplied/adapter status; never guarantee physical condition or receipt |

## Non-functional requirements

- **Explainability**: Every terminal verification includes cited evidence IDs, explicit limitations, and missing items.
- **Reliability & Idempotency**: All payment and resolution mutations require `Idempotency-Key` headers; webhooks are deduplicated via unique event IDs.
- **Zero-Trust Security**: Server-held credentials; Luhn card scrubbing; strict SSRF guards against internal IP ranges; sandboxed file parsers.
- **Regulatory Compliance**: Strictly non-custodial architecture complying with FinCEN MSB regulations, state escrow licensing, and PSD2.
- **Performance Targets**: Sub-500ms p95 API response time for ledger operations; background asynchronous verification with real-time SSE progress indicators.
- **Observability**: Correlation IDs and Promise IDs across all API logs, AI runs, PayPal calls, and audit trail entries.

## Success metrics for hackathon MVP

- A judge can execute a complete Sandbox payment-to-outcome path in under 8 minutes.
- 100% of demo verification results show requirement-level evidence and reasoning.
- All PayPal events used in the demo pass signature validation or are explicitly identified as simulator events in test mode.
- No financial API call can originate from an AI tool call or from an unauthenticated browser request.
- Cryptographic dispute defense dossiers are generated and verifiable by the native Rust Merkle crate in under 1 millisecond.

## Out of scope

- Direct custodial banking (PromisePay never holds customer funds on its balance sheet; all delayed disbursement holds and payouts reside within PayPal Complete Payments).
- Autonomous money movement by AI models (AI is strictly advisory; financial captures, releases, and refunds are gated by deterministic server code and authorized humans).
- Physical goods condition guarantees or subjective artistic arbitration.
- Independent merchant underwriting or KYC issuance (delegated to PayPal Complete Payments partner onboarding).
- Independently fetching private third-party credentialed content or circumventing robots.txt.

## Acceptance scenarios

1. **Website promise**: AI extracts deliverables, seller submits staging URL and repository, headless crawler audits responsive viewports, and multi-judge consensus validates requirements.
2. **Document promise**: A document missing a mandatory section produces `REVIEW_REQUIRED`, identifies the missing section, and alerts human reviewers.
3. **Delivery promise**: Tracking evidence is corroborated with carrier status; a human reviewer can confirm delivery or override recommendations.
4. **Payment & delayed escrow**: Browser initiates checkout with fixed server-derived pricing; capture places funds on hold until outcome verification triggers automated release or gated refund.
5. **Customer dispute defense**: An inbound PayPal dispute webhook triggers automated assembly of an RFC 6962 Merkle dossier with transparency log proof and direct submission to PayPal's Disputes API.
