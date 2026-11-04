# PromisePay Engineering & Architecture Documentation Library

Welcome to the **PayPal PromisePay** technical documentation repository. This directory contains the architectural blueprints, API contracts, security audits, compliance guides, and hackathon evaluation resources governing the PromisePay platform.

---

## 🧭 Master Documentation Index

```
doc/
├── 🏛️ Architecture & Product
│   ├── PRD.md                       # Product Requirements & Acceptance Criteria
│   ├── ARCHITECTURE.md              # System Topology, Boundaries & Component Flow
│   ├── IMPLEMENTATION_PLAN.md       # Phased Implementation Milestones (Phases 0–6)
│   ├── DATABASE_SCHEMA.md           # PostgreSQL Relational Schema & Access Rules
│   └── DECISIONS.md                 # Architecture Decision Records (ADR-001 – ADR-008)
│
├── 💳 PayPal & Financial Systems
│   ├── PAYPAL_INTEGRATION.md        # Sandbox Orders v2, Captures, Webhooks & Fallbacks
│   ├── REGULATORY_COMPLIANCE.md     # Money Transmission, FinCEN MSB & Escrow Rules
│   └── API_SPEC.md                  # RESTful API Contract & OpenAPI Specification
│
├── 🧠 AI Engineering & Safety
│   ├── AI_DESIGN.md                 # Structured AI Workflow, Schemas & Fallbacks
│   ├── AI_ENGINEERING_DEEP_DIVE.md  # Deep Dive: Pipelines, Anti-Injection & Benchmarks
│   └── SECURITY.md                  # Threat Modeling, DLP, SSRF & Attack Defenses
│
├── 🛡️ Evidence, Quality & Operations
│   ├── EVIDENCE_VERIFICATION.md     # Evidence Ingestion, SHA-256 Provenance & Scoring
│   ├── TESTING.md                   # Test Pyramid, Fixtures & Release Quality Gates
│   └── DEMO_GUIDE.md                # 5-Step Under-3-Minute Judge Rehearsal Guide
│
└── 🚀 Roadmaps & Hackathon Strategy
    ├── STRATEGIC_IMPROVEMENTS.md    # Game-Theory Enhancements & Feature Expansion
    ├── INDUSTRY_READY_ROADMAP.md    # Production V2 Live Multi-Tenant Roadmap
    └── SPONSOR_INTEGRATIONS.md      # Integration Strategy for 10 Official Sponsors
```

---

## 📑 Detailed Category Guide

### 1. 🏛️ Architecture & Product
* **[PRD.md](PRD.md)**: Defines the core problem, user personas (Buyer, Seller, Arbitrator), scope boundaries, and acceptance criteria for proof-of-outcome lifecycles.
* **[ARCHITECTURE.md](ARCHITECTURE.md)**: Complete system design showing interaction between Next.js 15, FastAPI, Supabase PostgreSQL, Google Gemini, and PayPal REST APIs.
* **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)**: Phased milestone breakdown tracking completed deliverables across Foundations, Payments, AI, Evidence, and Resolutions.
* **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**: 16-table relational schema with Row-Level Security (RLS) policies and append-only audit log structures.
* **[DECISIONS.md](DECISIONS.md)**: Architecture Decision Records (ADR-001 through ADR-008) documenting why AI does not move money, relational graph modeling, and non-custodial licensing.

### 2. 💳 PayPal & Financial Systems
* **[PAYPAL_INTEGRATION.md](PAYPAL_INTEGRATION.md)**: Technical integration contract for PayPal Orders v2 (`intent: CAPTURE` & `AUTHORIZE`), signature postback verification, and error recovery.
* **[REGULATORY_COMPLIANCE.md](REGULATORY_COMPLIANCE.md)**: Legal blueprint analyzing US FinCEN MSB statutes, 49 state escrow licensing laws, EU PSD2/PSD3, and PayPal Complete Payments (PPCP) Delayed Disbursement.
* **[API_SPEC.md](API_SPEC.md)**: Formal OpenAPI contract specifying request/response payloads, HTTP status codes, and error models.

### 3. 🧠 AI Engineering & Safety
* **[AI_DESIGN.md](AI_DESIGN.md)**: Structured prompt schemas, Pydantic validation rules, and fail-closed outcome logic.
* **[AI_ENGINEERING_DEEP_DIVE.md](AI_ENGINEERING_DEEP_DIVE.md)**: In-depth analysis of anti-injection regex screening, Luhn algorithm card redaction, anti-hallucination ID verification, and Multi-Judge Consensus.
* **[SECURITY.md](SECURITY.md)**: Comprehensive STRIDE threat model covering secret isolation, SSRF prevention, and webhook replay protection.

### 4. 🛡️ Evidence, Quality & Operations
* **[EVIDENCE_VERIFICATION.md](EVIDENCE_VERIFICATION.md)**: Protocols for verifying URLs, screenshots, code repositories, document pages, and carrier tracking numbers with SHA-256 hashing.
* **[TESTING.md](TESTING.md)**: Full test pyramid strategy with unit, integration, and security test cases.
* **[DEMO_GUIDE.md](DEMO_GUIDE.md)**: Step-by-step judge walkthrough covering the 3 pre-seeded scenarios with an under-3-minute video rehearsal script.

### 5. 🚀 Roadmaps & Hackathon Strategy
* **[STRATEGIC_IMPROVEMENTS.md](STRATEGIC_IMPROVEMENTS.md)**: Solutions for post-capture incentive alignment, automated dispute defense dossiers, and phased authorization milestones.
* **[INDUSTRY_READY_ROADMAP.md](INDUSTRY_READY_ROADMAP.md)**: Production-grade V2 specification for multi-tenant auth (JWKS), live Playwright web crawling, and multi-merchant PPCP onboarding.
* **[SPONSOR_INTEGRATIONS.md](SPONSOR_INTEGRATIONS.md)**: Comprehensive integration guide for all 10 official hackathon sponsor tools (AG Grid, Bryntum, Render, APIMatic, etc.).
