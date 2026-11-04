# PayPal PromisePay

<div align="center">

**AI-Powered Proof-of-Outcome Lifecycle for PayPal Payments**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)](services/api)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js&logoColor=white)](apps/web)
[![PayPal](https://img.shields.io/badge/PayPal-Orders_v2_%7C_PPCP-003087?logo=paypal&logoColor=white)](doc/PAYPAL_INTEGRATION.md)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75C2?logo=google&logoColor=white)](doc/AI_DESIGN.md)
[![Rust](https://img.shields.io/badge/Engine-Rust_SHA--256_Merkle-DEA584?logo=rust&logoColor=white)](crates/promisepay-verify)
[![CI](https://img.shields.io/badge/CI-Passing-brightgreen?logo=github-actions&logoColor=white)](.github/workflows/ci.yml)
[![Deployment](https://img.shields.io/badge/Render-Live_Production-46E3B7?logo=render&logoColor=white)](https://promisepay-web.onrender.com)

**[🌐 Live Web Application](https://promisepay-web.onrender.com)** • **[⚡ Interactive API Docs (Swagger)](https://promisepay-api.onrender.com/docs)** • **[📖 Documentation Hub](doc/README.md)**

</div>

---

## 💡 What is PromisePay?

In digital freelancing, custom software development, milestone contracts, and online delivery, a standard payment receipt only proves that money moved—**not whether the agreed outcome happened**. When an outcome is disputed, PayPal and merchants lose billions annually in chargebacks, manual investigation, and dispute resolution.

**PromisePay links what was promised, a PayPal payment, fulfillment evidence, explainable AI verification, and a human-controlled resolution into one auditable lifecycle.**

Every transaction is anchored to an immutable **Promise ID** (e.g., `PP-DEMO1-2026`) that connects:
1. **The Agreement:** AI extracts and versions atomic, verifiable requirements (`REQ-1`, `REQ-2`).
2. **The PayPal Payment:** Server-side PayPal Orders v2 creation, capture, and conditional delayed escrow.
3. **The Evidence Vault:** Cryptographically hashed URLs, repositories, documents, and carrier tracking data.
4. **Explainable AI Verification:** Google Gemini evaluates evidence against criteria with anti-injection defenses and mathematical confidence bounds.
5. **Human Governance & Automated Refund:** 1-click agreement cancellation, non-delivery SLA refund, and cryptographic Merkle dispute defense.

> **Crucial Safety Guarantee (ADR-001):** The AI engine operates purely as an objective auditor and **never has the authority or credentials to move money**. All monetary actions require deterministic server policies and authorized human approval.

---

## 🌟 Key Features

| Capability | Description |
| :--- | :--- |
| **Server-Side PayPal Orders v2** | Server-created checkout with `intent: CAPTURE` and PPCP Delayed Escrow fallback, ensuring zero client price tampering. |
| **Explainable AI Verification** | Google Gemini audits evidence item-by-item with strict Pydantic schemas, anti-hallucination ID whitelisting, and confidence clamping ($\le 0.59$ for unverified claims). |
| **Adversarial & PII Shield** | Built-in regex prompt-injection defense (100% block rate) and Luhn algorithm Data Loss Prevention (PCI-DSS & GDPR compliant). |
| **1-Click Cancellation & SLA Refund** | If a project is cancelled or the seller misses delivery deadlines, buyers can execute an immediate full PayPal refund with one click. |
| **Cryptographic Merkle Dispute Dossier** | A high-performance **Rust micro-engine** compiles all requirements, capture receipts, and evidence hashes into an RFC 6962 SHA-256 Merkle tree formatted for PayPal's Resolution Center. |
| **Enterprise AG Grid Ledger** | Fast, interactive Next.js 15 ledger with multi-column sorting, category filtering, search, and live Server-Sent Events (SSE). |
| **Pre-Seeded Judge Rehearsal** | Three canonical scenarios ready out-of-the-box with a 1-click `🔄 Reset Demo Scenarios` button. |

---

## 🏛️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     PROMISEPAY CLIENT (Next.js 15)                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   AG Grid Ledger        │  │  Interactive Dispute Dossier Modal  │  │
│  │  (Status, Escrow, Logs) │  │  (Printable PDF & JSON Export)      │  │
│  └─────────────────────────┘  └─────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST / SSE
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    PROMISEPAY API GATEWAY (FastAPI)                    │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────┐ │
│  │ PayPal REST Client    │  │ Gemini AI Engine      │  │ Rust Engine │ │
│  │ (Orders v2, Captures) │  │ (DLP, Anti-Injection) │  │ (Merkle)    │ │
│  └───────────────────────┘  └───────────────────────┘  └─────────────┘ │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
     ┌───────────────────┐┌───────────────────┐┌───────────────────┐
     │  PayPal Sandbox   ││  Google Gemini    ││ Supabase Postgres │
     │  & Webhook Engine ││  Generative AI    ││ & Storage Vault   │
     └───────────────────┘└───────────────────┘└───────────────────┘
```

The canonical lifecycle is:  
`Draft Promise` $\to$ `Ready for Payment` $\to$ `Captured / Escrow` $\to$ `Fulfillment` $\to$ `Evidence Submitted` $\to$ `AI Verification` $\to$ `Complete / Review Required` $\to$ `Authorized Action (Payout / Refund)`

---

## 🚀 Quickstart: Local Setup in 2 Minutes

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node 20 / 22)
- **Python**: 3.11+
- **Git**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/promisepay/paypal-promisepay.git
cd paypal-promisepay

# Copy environment configuration
cp .env.example .env

# Install dependencies
npm install
pip install -r requirements.txt
```

### 3. Launch Services
Open two terminal windows:

**Terminal 1 (Backend API & Observability):**
```bash
npm run dev:api
# API runs on: http://localhost:8000
# OpenAPI Docs: http://localhost:8000/docs
```

**Terminal 2 (Web Client & AG Grid Ledger):**
```bash
npm run dev:web
# Web UI runs on: http://localhost:3000
```

---

## 🧪 Pre-Seeded Judge Scenarios

PromisePay includes three pre-seeded scenarios demonstrating different commercial outcome categories:

| Scenario | Promise ID | Category | Amount | Demonstrates |
| :--- | :--- | :--- | :--- | :--- |
| **1. Next.js Storefront** | `PP-DEMO1-2026` | Digital Project | $450.00 USD | Live deployment URL, Git repository, and screenshot verified with high confidence ($> 90\%$). |
| **2. SOC2 Audit Report** | `PP-DEMO2-2026` | Pro Document | $300.00 USD | 12-page PDF intentionally missing the "Access Matrix" ($12 < 15$ pages), triggering `REVIEW_REQUIRED`. |
| **3. IoT Sensor Kit** | `PP-DEMO3-2026` | Physical Delivery | $120.00 USD | Express courier tracking with automated delivery scan verification. |

> **Judge Tip:** Click the **`🔄 Reset Demo Scenarios`** button at the top of the Promise Ledger anytime to re-initialize all data back to clean defaults!

---

## 📂 Repository Structure

```text
├── apps/
│   └── web/                     # Next.js 15 frontend, Tailwind CSS, AG Grid Enterprise
├── services/
│   ├── api/                     # FastAPI backend, PayPal REST client, AI engine
│   └── worker/                  # Asynchronous queue worker & deliverable scraper
├── crates/
│   └── promisepay-verify/       # High-performance Rust RFC 6962 Merkle tree engine
├── infra/
│   ├── supabase/                # PostgreSQL schema migrations (00001_initial_schema.sql)
│   └── scripts/                 # Secret scanner, migration check & Python runners
├── doc/                         # Complete technical documentation hub (17 guides)
└── .github/
    └── workflows/               # Automated CI pipeline (Lint, Test, Secret Scan)
```

---

## 📖 Complete Documentation Index

For in-depth architectural blueprints, security audits, and regulatory models, visit the **[Documentation Hub](doc/README.md)**:

| Category | Documents |
| :--- | :--- |
| **🏛️ Architecture & Product** | • [PRD.md](doc/PRD.md)<br>• [ARCHITECTURE.md](doc/ARCHITECTURE.md)<br>• [IMPLEMENTATION_PLAN.md](doc/IMPLEMENTATION_PLAN.md)<br>• [DATABASE_SCHEMA.md](doc/DATABASE_SCHEMA.md)<br>• [DECISIONS.md](doc/DECISIONS.md) |
| **💳 PayPal & Payments** | • [PAYPAL_INTEGRATION.md](doc/PAYPAL_INTEGRATION.md)<br>• [REGULATORY_COMPLIANCE.md](doc/REGULATORY_COMPLIANCE.md)<br>• [API_SPEC.md](doc/API_SPEC.md) |
| **🧠 AI Engineering & Security** | • [AI_DESIGN.md](doc/AI_DESIGN.md)<br>• [AI_ENGINEERING_DEEP_DIVE.md](doc/AI_ENGINEERING_DEEP_DIVE.md)<br>• [SECURITY.md](doc/SECURITY.md) |
| **🛡️ Quality & Operations** | • [EVIDENCE_VERIFICATION.md](doc/EVIDENCE_VERIFICATION.md)<br>• [TESTING.md](doc/TESTING.md)<br>• [DEMO_GUIDE.md](doc/DEMO_GUIDE.md) |
| **🚀 Roadmaps & Ecosystem** | • [STRATEGIC_IMPROVEMENTS.md](doc/STRATEGIC_IMPROVEMENTS.md)<br>• [INDUSTRY_READY_ROADMAP.md](doc/INDUSTRY_READY_ROADMAP.md)<br>• [SPONSOR_INTEGRATIONS.md](doc/SPONSOR_INTEGRATIONS.md) |

---

## ⚖️ License

Distributed under the **Apache-2.0 License**. See [LICENSE](LICENSE) for full details.
