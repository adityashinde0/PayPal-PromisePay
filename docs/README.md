# 📖 PromisePay Engineering & Architecture Documentation Library

<div align="center">

**Enterprise-Grade Non-Custodial Verifiable Conditional Payment Platform**<br/>
*Comprehensive Technical Documentation, System Architecture, API Contracts & Developer Tooling*

[![PayPal Integration](https://img.shields.io/badge/PayPal-Orders_v2_%7C_PPCP-003087?logo=paypal&logoColor=white)](PAYPAL_INTEGRATION.md)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75C2?logo=google&logoColor=white)](AI_DESIGN.md)
[![Rust Merkle Engine](https://img.shields.io/badge/Engine-Rust_SHA--256_Merkle-DEA584?logo=rust&logoColor=white)](../crates/promisepay-verify)
[![OpenAPI Spec](https://img.shields.io/badge/OpenAPI-3.1.0-6BA539?logo=openapi-initiative&logoColor=white)](openapi.json)
[![Postman Collection](https://img.shields.io/badge/Postman-v2.1.0-FF6C37?logo=postman&logoColor=white)](PayPal_PromisePay.postman_collection.json)

[🌐 Main Repository README](../README.md) • [🤝 Contributing Guide](../CONTRIBUTING.md) • [🔒 Security Policy](../SECURITY.md) • [📜 Changelog](../CHANGELOG.md)

</div>

---

## 🧭 Master Documentation Index

```text
docs/
├── 🏛️ Architecture & Product Design
│   ├── PRD.md                           # Product Requirements, Target Personas & Core Lifecycle
│   ├── ARCHITECTURE.md                  # System Topology, Boundaries & Dual Python+Rust Engine
│   ├── DATABASE_SCHEMA.md               # 16-Table Relational Schema, RLS Policies & Audit Trails
│   └── DECISIONS.md                     # Architecture Decision Records (ADR-001 through ADR-010)
│
├── 💳 PayPal & Financial Systems
│   ├── PAYPAL_INTEGRATION.md            # Orders v2, Captures, Delayed Escrow & Webhook Postback
│   ├── PAYPAL_ENTERPRISE_ADOPTION.md    # 100/100 Enterprise Adoption Readiness Scorecard & Telemetry
│   ├── REGULATORY_COMPLIANCE.md         # US FinCEN MSB, 49 State Escrow Rules & EU PSD2/PSD3
│   └── API_SPEC.md                      # RESTful Endpoint Contract, Models & Error Payloads
│
├── 🧠 AI Engineering, Safety & Cryptography
│   ├── AI_DESIGN.md                     # Structured Prompt Schemas, Confidence Clamping & Fallbacks
│   ├── AI_ENGINEERING_DEEP_DIVE.md      # Anti-Injection Regex, Luhn DLP & Multi-Judge Consensus
│   └── SECURITY_ARCHITECTURE.md         # STRIDE Threat Matrix, SSRF Guards & Incident Response
│
├── 🛡️ Evidence, Quality & Verification
│   ├── EVIDENCE_VERIFICATION.md         # Multi-Modal Ingestion, SHA-256 Fingerprinting & Review Triggers
│   ├── TESTING.md                       # Comprehensive Test Matrix, Fixtures & Quality Gates
│   └── DEMO_GUIDE.md                    # 5-Step Under-3-Minute Judge Rehearsal Guide & Scenarios
│
├── 🚀 Roadmaps & Ecosystem
│   ├── STRATEGIC_IMPROVEMENTS.md        # Game-Theory Mechanics & Dispute Defense Dossiers
│   ├── INDUSTRY_READY_ROADMAP.md        # Production V2 Live Multi-Tenant Roadmap & Playwright Crawler
│   └── SPONSOR_INTEGRATIONS.md          # Strategic Integration Matrix for 10 Sponsor Tools
│
└── 📦 Exportable API & Evaluation Assets
    ├── openapi.json                     # Complete OpenAPI 3.1.0 JSON Schema (120+ KB)
    └── PayPal_PromisePay.postman_collection.json # Postman Collection v2.1.0 with Environment Variables
```

---

## ⚡ Role-Based Quick Navigation

Find relevant technical guides matched to your evaluation or engineering objectives:

| Evaluation / Engineering Persona | Recommended Reading Path |
| :--- | :--- |
| **🏆 Hackathon Judges & Evaluators** | 1. [DEMO_GUIDE.md](DEMO_GUIDE.md) (Under-3-minute walkthrough & 3 pre-seeded scenarios)<br>2. [PRD.md](PRD.md) (Problem statement, buyer/seller/reviewer personas)<br>3. [ARCHITECTURE.md](ARCHITECTURE.md) (System topology & dual Python+Rust engine) |
| **💳 PayPal Integration & Fintech Reviewers** | 1. [PAYPAL_INTEGRATION.md](PAYPAL_INTEGRATION.md) (Orders v2 capture, delayed escrow, webhooks)<br>2. [PAYPAL_ENTERPRISE_ADOPTION.md](PAYPAL_ENTERPRISE_ADOPTION.md) (100/100 enterprise scorecard & sandbox telemetry)<br>3. [REGULATORY_COMPLIANCE.md](REGULATORY_COMPLIANCE.md) (FinCEN MSB exemption & non-custodial status) |
| **🧠 AI Engineers & Security Auditors** | 1. [AI_DESIGN.md](AI_DESIGN.md) (Pydantic schemas & fail-closed outcome policy)<br>2. [AI_ENGINEERING_DEEP_DIVE.md](AI_ENGINEERING_DEEP_DIVE.md) (Multi-Judge consensus, regex anti-injection, Luhn DLP)<br>3. [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) (STRIDE threat model & SSRF defense) |
| **🛠️ Core Platform & Backend Developers** | 1. [ARCHITECTURE.md](ARCHITECTURE.md) (FastAPI + Rust micro-engine + Next.js topology)<br>2. [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) (16-table PostgreSQL schema & RLS rules)<br>3. [API_SPEC.md](API_SPEC.md) (REST endpoints, SSE events, error responses)<br>4. [TESTING.md](TESTING.md) (Complete test matrix, execution commands & gates) |
| **📦 API Consumers & Integrators** | 1. [openapi.json](openapi.json) (OpenAPI 3.1.0 JSON specification)<br>2. [PayPal_PromisePay.postman_collection.json](PayPal_PromisePay.postman_collection.json) (Pre-configured Postman requests)<br>3. [SPONSOR_INTEGRATIONS.md](SPONSOR_INTEGRATIONS.md) (AG Grid, Bryntum, Render, APIMatic integrations) |

---

## 📑 Detailed Category Guide

### 1. 🏛️ Architecture & Product Design

* **[PRD.md](PRD.md)**<br/>
  *Product Requirements Document & MVP Acceptance Criteria*<br/>
  Defines the commercial problem of outcome uncertainty, target personas (Buyer, Merchant, Arbitrator), atomic requirement decomposition, core lifecycle states, and MVP scope boundaries.
* **[ARCHITECTURE.md](ARCHITECTURE.md)**<br/>
  *System Topology, Trust Boundaries & Dual-Engine Architecture*<br/>
  Detailed architecture blueprint showing the interaction between Next.js 15 frontend, FastAPI backend, native Rust RFC 6962 Merkle proof engine (`crates/promisepay-verify`), Supabase PostgreSQL, Google Gemini AI, and PayPal REST APIs.
* **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**<br/>
  *Relational Data Model, RLS Policies & Audit Log Structures*<br/>
  Full specification of the 16-table PostgreSQL schema in Supabase, covering promises, requirements, payments, evidence files, verifications, resolution cases, and immutable audit ledgers with Row-Level Security (RLS) enforcement.
* **[DECISIONS.md](DECISIONS.md)**<br/>
  *Architecture Decision Records (ADRs)*<br/>
  Catalog of formal Architectural Decision Records (ADR-001 through ADR-010) documenting critical design choices, including AI non-authority over funds (ADR-001), non-custodial licensing (ADR-008), Multi-Judge Consensus (ADR-009), and Native Rust Merkle tree verification (ADR-010).

---

### 2. 💳 PayPal & Financial Systems

* **[PAYPAL_INTEGRATION.md](PAYPAL_INTEGRATION.md)**<br/>
  *PayPal Orders v2, Delayed Escrow & Webhook Postback Contract*<br/>
  Comprehensive integration guide covering server-side PayPal Orders v2 creation (`intent: CAPTURE` and `AUTHORIZE`), client popup flow via `@paypal/react-paypal-js`, PPCP Delayed Disbursement, webhook signature verification (`PAYPAL-TRANSMISSION-SIG`), and failure handling.
* **[PAYPAL_ENTERPRISE_ADOPTION.md](PAYPAL_ENTERPRISE_ADOPTION.md)**<br/>
  *Enterprise Adoption Readiness Report & 100/100 Production Scorecard*<br/>
  Detailed technical readiness report certifying PromisePay across 5 enterprise pillars: Payment Reliability, AI Safety & Verification Bounds, Regulatory Non-Custodial Architecture, Enterprise Observability, and Developer Experience. Includes live sandbox telemetry and production verification proofs.
* **[REGULATORY_COMPLIANCE.md](REGULATORY_COMPLIANCE.md)**<br/>
  *Financial Regulations, Money Transmission & Non-Custodial Architecture*<br/>
  In-depth legal and regulatory analysis establishing PromisePay's non-custodial status under US FinCEN MSB rules, 49 state money transmission and escrow laws, EU/UK PSD2/PSD3 directives, and PayPal Complete Payments (PPCP) escrow frameworks.
* **[API_SPEC.md](API_SPEC.md)**<br/>
  *RESTful API Specification & Endpoint Contracts*<br/>
  Complete REST API documentation detailing all endpoints, request schemas, response models, HTTP status codes, Server-Sent Events (SSE) streaming (`/events/promises/{id}`), and standardized error structures.

---

### 3. 🧠 AI Engineering, Safety & Cryptography

* **[AI_DESIGN.md](AI_DESIGN.md)**<br/>
  *AI Verification Workflow, Prompt Schemas & Safety Fallbacks*<br/>
  Structured AI verification pipeline utilizing Google Gemini 1.5. Defines atomic requirement extraction, Pydantic schema validation, anti-hallucination ID verification, confidence score clamping ($\le 0.59$ for unverified claims), and fail-closed human review policies.
* **[AI_ENGINEERING_DEEP_DIVE.md](AI_ENGINEERING_DEEP_DIVE.md)**<br/>
  *Anti-Injection Shields, Luhn DLP & Multi-Judge Consensus*<br/>
  Technical deep dive into the AI safety pipeline: regex-based prompt-injection scrubbing (100% block rate against adversarial attacks), mathematical Luhn algorithm Data Loss Prevention (redacting credit card numbers and sensitive PII), and multi-judge consensus scoring across independent models.
* **[SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md)**<br/>
  *STRIDE Threat Model, SSRF Safeguards & Defense-in-Depth*<br/>
  Security architecture blueprint detailing threat analysis across all six STRIDE categories, private network SSRF guards, webhook replay protections, secret management isolation, and rapid incident response playbooks.

---

### 4. 🛡️ Evidence, Quality & Verification

* **[EVIDENCE_VERIFICATION.md](EVIDENCE_VERIFICATION.md)**<br/>
  *Evidence Ingestion, Content Addressing & Provenance Tracking*<br/>
  Defines evidence ingestion protocols across 5 deliverable modalities: live deployment URLs, GitHub/GitLab repositories, documents/PDFs, image screenshots, and courier tracking numbers. Specifies SHA-256 cryptographic hashing, MIME validation, and human review trigger rules.
* **[TESTING.md](TESTING.md)**<br/>
  *Test Strategy, Test Matrix & Release Quality Gates*<br/>
  Comprehensive testing handbook covering the full test pyramid: unit tests, integration tests, adversarial prompt-injection tests, and security tests. Reflects the 102 passing tests across backend API, async worker, and Rust cryptographic engine.
* **[DEMO_GUIDE.md](DEMO_GUIDE.md)**<br/>
  *Judge Walkthrough, Pre-Seeded Scenarios & Video Rehearsal*<br/>
  Step-by-step rehearsal guide for hackathon judges and evaluators. Includes fresh-clone commands, under-3-minute video rehearsal script, walkthroughs of the 3 pre-seeded demo scenarios (`PP-DEMO1-2026`, `PP-DEMO2-2026`, `PP-DEMO3-2026`), and 1-click demo reset instructions.

---

### 5. 🚀 Roadmaps & Hackathon Strategy

* **[STRATEGIC_IMPROVEMENTS.md](STRATEGIC_IMPROVEMENTS.md)**<br/>
  *Game-Theory Mechanisms & Automated Dispute Defense Dossiers*<br/>
  Strategic architectural enhancements: post-capture incentive alignment, automated dispute defense dossiers formatted for the PayPal Resolution Center, and multi-stage payment milestone authorizations.
* **[INDUSTRY_READY_ROADMAP.md](INDUSTRY_READY_ROADMAP.md)**<br/>
  *Production V2 Roadmap, Multi-Tenant RBAC & Live Crawlers*<br/>
  Production-grade V2 implementation roadmap detailing JWKS-based multi-tenant authentication, headless Playwright web crawling for autonomous deliverable extraction, and multi-merchant PPCP platform onboarding.
* **[SPONSOR_INTEGRATIONS.md](SPONSOR_INTEGRATIONS.md)**<br/>
  *Sponsor Tools Integration Guide & Technical Value Matrix*<br/>
  Comprehensive integration analysis detailing how PromisePay leverages and integrates 10 hackathon sponsor tools: AG Grid Community, Bryntum Gantt, Render Cloud, APIMatic, Neo4j, Couchbase, Daily.co, and others.

---

## 📦 API Specifications & Evaluation Assets

PromisePay provides machine-readable interface specifications and ready-to-use testing collections located directly in this `docs/` directory:

| Asset File | Format | Description | Quick Usage |
| :--- | :--- | :--- | :--- |
| **[openapi.json](openapi.json)** | OpenAPI 3.1.0 JSON | Complete machine-readable API specification covering all 20+ endpoints, Pydantic models, request bodies, and error structures. | Import into [Swagger Editor](https://editor.swagger.io/) or APIMatic SDK Generator. |
| **[PayPal_PromisePay.postman_collection.json](PayPal_PromisePay.postman_collection.json)** | Postman v2.1.0 JSON | Complete Postman collection containing pre-configured requests, authentication headers, environment variables, and automated test scripts. | Open Postman $\to$ **Import** $\to$ Select `docs/PayPal_PromisePay.postman_collection.json`. |

---

## 🔗 Repository Cross-References

| Root Document | Purpose & Description | Relative Link |
| :--- | :--- | :--- |
| **Repository README** | Main landing page, PayPal-themed hero, badges, architecture diagrams, and 2-minute quickstart. | [../README.md](../README.md) |
| **Contributing Guide** | Development workflow, coding conventions, non-custodial rules, and testing standards. | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| **Security Policy** | GitHub private vulnerability reporting procedures, SLAs, and responsible disclosure policy. | [../SECURITY.md](../SECURITY.md) |
| **Project Changelog** | Semantic release history following Keep a Changelog across Phase 0–6 and Rust engine. | [../CHANGELOG.md](../CHANGELOG.md) |
| **License** | Apache 2.0 open-source license governing this project. | [../LICENSE](../LICENSE) |

---

## 🛠️ Documentation Governance & Link Verification

All documentation in `docs/` follows strict enterprise standards:
1. **Link Integrity**: Every relative link must resolve cleanly to an existing target file or anchor. No broken or dead links are permitted.
2. **Monotonic Headings**: All Markdown files use monotonic ATX headings (`#` $\to$ `##` $\to$ `###`) without level skips.
3. **Tagged Code Fences**: All code blocks must specify an explicit language identifier (e.g., ````python`, ````bash`, ````text`, ````mermaid`).
4. **Automated Verification**: Run the project link verification script to validate link integrity:
   ```bash
   python3 infra/scripts/verify_links.py
   ```
