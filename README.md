# PayPal PromisePay

**AI-powered proof-of-outcome for payments.** PromisePay links what was promised, a PayPal payment, fulfillment evidence, explainable AI verification, and a human-controlled resolution into one auditable lifecycle.

> **Status:** engineering blueprint for the PayPal AI Hackathon MVP. The product uses PayPal Sandbox only until production readiness, compliance review, and merchant onboarding are complete.

## What it proves

When a buyer pays for a website, professional document, or delivery, a payment record alone does not describe whether the agreed outcome happened. PromisePay creates a stable **Promise ID** (for example, `PP-8F72X-2026`) and connects it to the agreement, PayPal order/capture, evidence, verification results, and resolution history.

AI extracts requirements and evaluates evidence requirement by requirement. It recommends an outcome; it never moves money. A deterministic policy plus an authorized human or business workflow performs any permitted PayPal action.

## MVP

| Included | Deliberately excluded |
| --- | --- |
| Digital-project, document, and delivery promise templates | Escrow, custody, or automatic release of funds |
| PayPal Sandbox Orders v2 create/capture | Production payments or claims of physical-quality guarantees |
| Verified webhooks and immutable audit events | Autonomous refunds, chargebacks, or dispute filing |
| URL, document, screenshot, repository, and tracking-reference evidence | Marketplace / logistics integrations beyond demo adapters |
| Structured AI extraction, planning, and explainable verification | A model as the final financial decision-maker |

## Architecture

```text
Next.js + TypeScript + Tailwind + AG Grid
        |                                  
FastAPI API ── Supabase PostgreSQL / object storage
  |       |                 |
  |       └── AI provider (structured JSON only)
  └── PayPal REST APIs + verified webhooks
```

The canonical lifecycle is:

`Draft promise → payment pending → captured → fulfillment in progress → evidence submitted → verification → complete / review required / not verified → authorized action`

Read [ARCHITECTURE.md](doc/ARCHITECTURE.md), [PAYPAL_INTEGRATION.md](doc/PAYPAL_INTEGRATION.md), and [DEMO_GUIDE.md](doc/DEMO_GUIDE.md) before implementation.

## Current official-platform decisions (verified 2026-11-02)

- PayPal **Orders v2** supports server-created orders with `CAPTURE` or `AUTHORIZE` intent; the current MVP uses `CAPTURE`. If an authorization flow is added later, PayPal documents a 29-day authorization validity window. [Orders API guide](https://developer.paypal.com/api/rest/integration/orders-api)
- The API server creates and captures orders; the browser only renders PayPal Checkout. PayPal explicitly advises against calling Orders v2 directly from the browser. [Official integration guidance](https://developer.paypal.com/api/rest/integration/orders-api)
- PayPal supports refunds of a captured payment at `POST /v2/payments/captures/{capture_id}/refund`; PromisePay exposes this only through an authorized resolution action. [Payments v2 reference](https://developer.paypal.com/api/payments/v2)
- Webhooks must be HTTPS, signature-verified, idempotently persisted, and acknowledged promptly. PayPal provides both self-verification and a verification endpoint. [Webhook integration guide](https://developer.paypal.com/api/rest/webhooks/rest/)
- New checkout integrations should use the current JavaScript SDK v6 / React SDK path; checkout order operations remain server-side. [PayPal Next.js guide](https://developer.paypal.com/guides/nextjs-checkout)

## Hackathon checklist (verified 2026-11-02)

The [official rules](https://paypalaihackathon.devpost.com/rules) require meaningful use of both PayPal and AI, a functional build judges can run or a hosted demo, a public open-source repository with a visible license, complete setup instructions, and a publicly visible YouTube demo under three minutes. Current deadline: **November 12, 2026, 12:00 pm Pacific**. Judging gives equal weight to technological implementation, design, impact, innovation, and presentation.

## Getting started (planned repository layout)

```text
apps/web/                 # Next.js interface and AG Grid ledger
services/api/             # FastAPI, PayPal client, AI orchestration
services/worker/          # optional async verification worker
infra/                    # deployment configuration
docs/                     # diagrams and API collection assets
```

1. Copy `.env.example` to a local, untracked `.env` file.
2. Create PayPal Sandbox buyer and business test accounts and a Sandbox REST app in the PayPal Developer Dashboard.
3. Configure the webhook URL and store its webhook ID.
4. Run the web app and API according to the eventual package-level instructions.
5. Complete a Sandbox purchase, upload evidence, run verification, and approve a resolution in the demo.

## Vetted implementation resources

These are references to adapt, not code to paste blindly. Preserve their licenses and re-check their current docs before implementation.

| Resource | Reuse-worthy part | How PromisePay uses it |
| --- | --- | --- |
| [PayPal Next.js Checkout guide](https://developer.paypal.com/guides/nextjs-checkout) | SDK v6 React component and server-side create/capture pattern | Checkout UI only; FastAPI owns REST calls rather than Next.js server actions |
| [Official Express Checkout demo](https://github.com/paypaldev/example-node-express) | Server-held prices, create → approve → capture flow, environment handling | Reference for trust boundary and test setup, not a backend dependency |
| [Orders v2 guide](https://developer.paypal.com/api/rest/integration/orders-api) | Order, capture, authorize, tracking endpoints | Canonical payment workflow and later authorization experiment |
| [PayPal webhook guide](https://developer.paypal.com/api/rest/webhooks/rest/) | Raw-body signature verification and replay-safe delivery behavior | FastAPI webhook boundary and automated tests |
| [PayPal security guidelines](https://developer.paypal.com/security-guidelines) | Secret handling, TLS, signature verification, negative testing | Security acceptance criteria |
| [PayPal official Postman collection](https://developer.paypal.com/api/rest/integration/orders-api) | Current request/response examples | Build and validate the project's public collection |
| [AG Grid documentation](https://www.ag-grid.com/documentation/) | Server-side sorting/filtering and detail panels | Promise Ledger and evidence/audit data views |

See [IMPLEMENTATION_PLAN.md](doc/IMPLEMENTATION_PLAN.md) for the exact adaptation boundaries and [CONTRIBUTING.md](CONTRIBUTING.md) for license and attribution rules.

## Documentation index

- [PRD.md](doc/PRD.md) — product requirements and MVP acceptance criteria
- [ARCHITECTURE.md](doc/ARCHITECTURE.md) — components, data flow, and trust boundaries
- [IMPLEMENTATION_PLAN.md](doc/IMPLEMENTATION_PLAN.md) — sequenced build plan
- [API_SPEC.md](doc/API_SPEC.md) — PromisePay API contract
- [DATABASE_SCHEMA.md](doc/DATABASE_SCHEMA.md) — PostgreSQL model and access controls
- [AI_DESIGN.md](doc/AI_DESIGN.md) — structured AI workflow and safety rails
- [AI_ENGINEERING_DEEP_DIVE.md](doc/AI_ENGINEERING_DEEP_DIVE.md) — in-depth technical analysis of AI pipelines, anti-injection, DLP, and professional developer boundaries
- [PAYPAL_INTEGRATION.md](doc/PAYPAL_INTEGRATION.md) — Sandbox integration contract
- [EVIDENCE_VERIFICATION.md](doc/EVIDENCE_VERIFICATION.md) — evidence/provenance and scoring
- [SECURITY.md](doc/SECURITY.md) — threat model and controls
- [TESTING.md](doc/TESTING.md) — quality strategy and release gates
- [DEMO_GUIDE.md](doc/DEMO_GUIDE.md) — reproducible end-to-end demo
- [DECISIONS.md](doc/DECISIONS.md) — architecture decision records
- [STRATEGIC_IMPROVEMENTS.md](doc/STRATEGIC_IMPROVEMENTS.md) — roadmap, game-theory solutions, and strategic feature enhancements
- [INDUSTRY_READY_ROADMAP.md](doc/INDUSTRY_READY_ROADMAP.md) — system audit and production-grade V2 live platform roadmap
- [REGULATORY_COMPLIANCE.md](doc/REGULATORY_COMPLIANCE.md) — money transmission laws, escrow regulations, PPCP marketplace policies, and PCI-DSS compliance
- [SPONSOR_INTEGRATIONS.md](doc/SPONSOR_INTEGRATIONS.md) — comprehensive guide & integration blueprint for all 10 hackathon sponsor tools

## License

Apache-2.0. See [LICENSE](LICENSE).
