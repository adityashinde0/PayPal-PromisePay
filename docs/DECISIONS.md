# Architecture decision records

## ADR-001 — AI does not move money

**Decision:** AI creates structured recommendations only. PayPal create/capture/refund calls are invoked by deterministic server workflows; refunds additionally require an authorized human/business decision.

**Why:** Model outputs can be incorrect, manipulated, or incomplete. Financial authority requires deterministic controls, least privilege, auditability, and human accountability.

**Consequence:** PromisePay is proof-of-outcome infrastructure, not AI escrow. The demo is credible without claiming custody or automated release.

## ADR-002 — Human review is a first-class outcome

**Decision:** `REVIEW_REQUIRED` is a successful safety state, not an error.

**Why:** Delivery quality, ambiguous documents, conflicting evidence, and real-world facts often cannot be determined safely from submitted artifacts.

**Consequence:** Every ambiguous case has a reviewer workflow, decision reason, and audit trail. The product avoids false certainty.

## ADR-003 — Promise IDs are the lifecycle root

**Decision:** Generate an immutable, public-safe Promise ID before payment and store it separately from PayPal order/capture IDs and merchant references.

**Why:** Payment, order, evidence, verification, and case systems otherwise have disconnected identifiers. PayPal IDs remain authoritative for payment operations; the Promise ID gives humans one contextual lookup.

**Consequence:** The Promise ID may be placed in a sanitized PayPal `custom_id`, but never contains PII or sensitive agreement text.

## ADR-004 — Confidence indicates evidentiary support, not truth

**Decision:** AI returns confidence bands with cited evidence, limitations, and missing information. Deterministic caps prevent high confidence when provenance or citation is weak.

**Why:** A probability-looking score can otherwise imply a guarantee. Evidence quality and model uncertainty require transparent limits.

**Consequence:** Confidence cannot authorize money movement and must not override human-review triggers.

## ADR-005 — Use PayPal Orders v2 CAPTURE for MVP

**Decision:** Use server-side Orders v2 with `intent: CAPTURE`, then capture after buyer approval; reconcile via verified webhooks.

**Why:** It is a documented, direct Sandbox checkout flow that proves central PayPal integration without making unsupported escrow claims.

**Consequence:** Post-payment outcome evaluation is separate from fund control. An authorization/capture-later experiment is deferred and must honor documented timing, eligibility, and business constraints.

## ADR-006 — Refund is a gated supported action

**Decision:** Demonstrate captured-payment refund capability only as an explicit, authorized Sandbox resolution action.

**Why:** PayPal Payments v2 supports captured-payment refunds, but an evidence analyzer cannot decide legal/contractual entitlement or execute it safely.

**Consequence:** Require state, role, reason, confirmation, idempotency, audit record, and API response validation.

## ADR-007 — Relational Promise Graph first

**Decision:** Represent graph relationships in PostgreSQL with explicit tables and joins.

**Why:** Supabase/Postgres gives durable transactions, tenant policies, and a fast implementation path for the MVP.

**Consequence:** The API creates graph projections for UI; a dedicated graph database is a later optimization, not a prerequisite.

## ADR-008 — Non-custodial compliance & regulatory boundaries

**Decision:** PromisePay remains strictly non-custodial. All payment custody, authorizations, captures, delays, and disbursements reside exclusively with PayPal Inc. under its money transmitter and banking licenses.

**Why:** Under US FinCEN MSB regulations, state escrow statutes, and EU/UK PSD2/FCA directives, holding user funds in custody requires multi-million dollar reserves and statutory licenses.

**Consequence:** PromisePay provides proof-of-outcome auditing, cryptographic Merkle sealing, and structured dispute dossiers. When PayPal Complete Payments (PPCP) for Marketplaces is used, funds are placed on delayed disbursement within PayPal, never in a PromisePay account. Read [REGULATORY_COMPLIANCE.md](REGULATORY_COMPLIANCE.md) for full legal analysis.

## ADR-009 — Multi-Judge AI Consensus & DLP Sanitization Engine

**Decision:** Deploy a multi-judge consensus verification engine combining Google Gemini 1.5 Pro and Gemini 1.5 Flash alongside an independent deterministic Rule-Based Evaluator, preceded by an aggressive Data Loss Prevention (DLP) sanitization pipeline.

**Why:** Single-model evaluation is vulnerable to prompt injection attacks, subtle hallucinations, and model drift. Ingesting arbitrary agreement texts and deliverables risks exposing payment cardholder data (PCI-DSS) or personal identifiable information (GDPR) to external LLM providers. Furthermore, divergence between models indicates evidentiary ambiguity that must never be resolved autonomously.

**Consequence:** All incoming text is screened via `detect_hostile_input()` for known jailbreak vectors, credit cards are validated and scrubbed via the Luhn algorithm (`luhn_check()`), and PII/API credentials are redacted (`scrub_pii()`). During verification, both Gemini models and the deterministic rule evaluator must independently evaluate requirements. Any divergence or lack of corroborating evidence deterministically clamps confidence to $\le 0.59$ and routes the outcome to `HUMAN_REVIEW_REQUIRED`. Autonomous fund movement by AI is strictly prevented.

## ADR-010 — Native Rust RFC 6962 Merkle Tree Sealing Engine

**Decision:** Implement an RFC 6962-compliant cryptographic Merkle tree sealing engine in native Rust (`crates/promisepay-verify`) to generate deterministic 256-bit root hashes and audit inclusion proofs for dispute defense dossiers.

**Why:** Proving delivery outcomes to PayPal dispute adjudicators, enterprise merchants, and arbitration panels requires mathematical non-repudiation and zero-tamper evidence. Pure-Python hashing is susceptible to performance bottlenecks during batch sealing and lacks memory safety guarantees against timing attacks. RFC 6962 standard domain separation prevents second preimage attacks.

**Consequence:** The Rust engine enforces domain separation prefixes (`0x00` for leaf nodes, `0x01` for interior nodes) and deterministic lexicographical leaf sorting. Dispute defense dossiers achieve microsecond verification latency and generate compact inclusion proofs verifiable offline without revealing unrelated manifest deliverables. Dossiers submitted to PayPal Customer Disputes v1 API (`/v1/customer/disputes/{id}/provide-evidence`) provide indisputable cryptographic provenance.
