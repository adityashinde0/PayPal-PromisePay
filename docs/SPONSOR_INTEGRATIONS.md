# PayPal AI Hackathon: Sponsor Tools Integration & Strategy Guide

> **Document Status:** Official Architecture & Implementation Strategy<br/>
> **Target Event:** PayPal AI Hackathon 2026 (*"Build What's Next with PayPal and AI"*)<br/>
> **Project:** PayPal PromisePay — AI-Powered Proof-of-Outcome for Payments<br/>
> **Primary Goal:** Maximize hackathon evaluation scores, qualify for dedicated sponsor prize tracks, and turn PromisePay into an industry-grade, enterprise-ready platform.

---

## 1. Executive Summary & Value Proposition

In the PayPal AI Hackathon, integrating official partner and sponsor tools is one of the highest-leverage strategies available. It demonstrates:
1. **Architectural Maturity:** Real fintech applications do not reinvent the wheel; they integrate best-in-class infrastructure for grids, scheduling, agent sandboxes, and observability.
2. **Sponsor Prize Eligibility:** Sponsors like **Bryntum ($1,000 prize)**, **AG Grid**, **APIMatic**, **Channel3**, **Render**, and others have dedicated categories, cash bounties, and platform credits on top of the main \$67,500+ general prize pool.
3. **Judge Distinction:** Judges evaluate entries on *Technological Implementation*, *Design*, *Potential Impact*, and *Innovation*. Utilizing these tools elevates PromisePay from an MVP prototype to an enterprise-grade platform.

The 10 official sponsor tools identified from the requirements are:
1. **AG Grid** — Enterprise Data Grid, Audit & Promise Ledger
2. **APIMatic** — API Documentation, SDK Generation & AI Context Plugin
3. **Astropods** — Production AI Agent Operating System & Guardrails
4. **Bryntum** — Project Milestones, Scheduling & Gantt Timeline Visualization
5. **Channel3** — Real-Time Product Catalog & E-Commerce Procurement API / MCP Server
6. **Elastic** — Vector Search, Precedent Matching & Immutable Audit Logging
7. **KERNEL** — Cloud Headless Browser Infrastructure for Automated Web Outcome Verification
8. **Postman** — API Collection, Automated Test Suites & Judge Onboarding
9. **Render** — 24/7 Production Cloud Deployment & Agent Orchestration
10. **Zapier** — Multi-Platform Webhook Automation & Business Systems Integration (Slack, Jira, CRM)

---

## 2. Global Architecture Integration Map

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PROMISEPAY CLIENT (Next.js 15)                         │
│  ┌─────────────────────────┐  ┌────────────────────────────┐  ┌───────────────────────┐│
│  │   AG Grid Ledger        │  │  Bryntum Gantt / Schedule  │  │  PayPal Checkout SDK  ││
│  │  (Status, Escrow, Logs) │  │  (Milestones & Deadlines)  │  │  (Orders v2 Capture)  ││
│  └─────────────────────────┘  └────────────────────────────┘  └───────────────────────┘│
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ REST / WebSockets / Context Plugin
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROMISEPAY API GATEWAY (FastAPI)                          │
│  ┌───────────────────────┐  ┌─────────────────────────────┐  ┌────────────────────────┐│
│  │  APIMatic Context SDK │  │   FastAPI Webhook Handler   │  │   Postman Collection   ││
│  │  & OpenAPI Specs      │  │   & Idempotent Ledger       │  │   & Newman Test Suite  ││
│  └───────────────────────┘  └─────────────────────────────┘  └────────────────────────┘│
└──────┬────────────────────────────────────┬────────────────────────────────────┬───────┘
       │                                    │                                    │
       ▼                                    ▼                                    ▼
┌──────────────────────┐  ┌─────────────────────────────────┐  ┌───────────────────────────┐
│  AI AGENT RUNTIME    │  │       EXTERNAL EVIDENCE         │  │     BUSINESS AUTOMATION   │
│   (Astropods OS)     │  │          VERIFICATION           │  │          (Zapier)         │
│                      │  │                                 │  │                           │
│ • Deterministic      │  │ • KERNEL Headless Browser       │  │ • Slack/Discord Alerts    │
│   Guardrails         │  │   (Live URL/DOM Inspection)     │  │ • CRM & Jira Tickets      │
│ • Reasoning Engine   │  │ • Channel3 Product Catalog MCP  │  │ • Automated Invoicing     │
│ • Dispute Arbiter    │  │   (Physical Spec Matching)      │  │ • Email Notifications    │
└──────┬───────────────┘  └────────────────┬────────────────┘  └───────────────────────────┘
       │                                   │
       ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE & SEARCH (Supabase + Elastic)                      │
│ • PostgreSQL (Relational Promises, Escrow records, Evidence metadata)                   │
│ • Elastic Vector & Full-Text Search (Precedent disputes, Document semantic indexing)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         HOSTED INFRASTRUCTURE (Render Cloud)                           │
│ • promisepay-web (Next.js SSR/Static)                                                  │
│ • promisepay-api (FastAPI Docker container)                                            │
│ • promisepay-worker (Celery / Background Verification Worker)                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Deep-Dive: Sponsor Tools Breakdown

### 1. AG Grid
- **What it is:** The world standard for high-performance JavaScript/React data grids, filtering, sorting, and analytical reporting.
- **Role in PromisePay:**
  - Powers the **Promise Ledger** (`/ledger`), where buyers, sellers, and arbitrators review thousands of transactions with instant multi-column filtering, status badges, confidence scores, and dispute flags.
  - Renders the **Evidence & Audit Matrix** showing requirement-by-requirement evaluation logs with expandable master-detail rows.
- **Benefits for the Project:**
  - Enterprise aesthetics that impress judges immediately.
  - Native Excel/CSV export and virtualized rendering of large transaction sets without lag.
- **Implementation Blueprint:**
  - `ag-grid-community` and `ag-grid-react` (already present in `apps/web/package.json`).
  - Create a custom theme matching PromisePay's Tailwind UI palette.
  - Implement master-detail or cell renderers for PayPal transaction IDs, Promise IDs, and confidence pill badges.
- **User Action Required:** None (open-source community edition ready; optional enterprise trial key if advanced pivot tables are desired).

---

### 2. APIMatic
- **What it is:** Developer experience platform that converts OpenAPI definitions into multi-language typed SDKs (TypeScript, Python, Java, Go, C#), API documentation portals, and AI Context Plugins for LLM tool-calling.
- **Role in PromisePay:**
  - Automatically converts `docs/openapi.json` into developer-ready client SDKs.
  - Provides a hosted, interactive API documentation portal for hackathon judges and third-party merchants.
  - Enables **APIMatic Context Plugin** for AI Agents, allowing external autonomous purchasing agents to discover, interact with, and call PromisePay endpoints without hallucinating parameters.
- **Benefits for the Project:**
  - Dramatically improves developer onboarding score.
  - Gives PromisePay an "Agent-Ready API" narrative (crucial for the *Best Use of Agentic Commerce* award).
- **Implementation Blueprint:**
  - Ingest `services/api` OpenAPI schema into APIMatic.
  - Export a clean TypeScript SDK in `packages/sdk` or provide the APIMatic portal link in the documentation.
- **User Action Required:** Free APIMatic developer account signup (if generating hosted portal or private SDK packages).

---

### 3. Astropods
- **What it is:** Agent operating system and runtime framework built to run autonomous AI agents in production with memory, tool sandboxing, observability, declarative specs, and deterministic guardrails.
- **Role in PromisePay:**
  - Orchestrates the **Evidence Verification Agent** and **Resolution Arbiter Agent**.
  - Enforces hard guardrails: *AI models can recommend verdicts and compute satisfaction scores, but are cryptographically prevented from directly triggering money movements without human authorization or deterministic policy checks*.
  - Records full execution traces and thought trees for complete auditability.
- **Benefits for the Project:**
  - Provides defense against prompt injections (e.g. fraudulent sellers attempting to trick LLMs into validating unfulfilled work).
  - Gives full visibility into agent reasoning, token costs, and latency.
- **Implementation Blueprint:**
  - Define an Astropod agent manifest (`astropod.yaml` or Python agent definition) wrapping the Gemini 3.5 structured prompt pipeline in `services/api/promisepay_api/ai`.
  - Stream verification step logs to the frontend via WebSockets or SSE.
- **User Action Required:** Astropods API Key or CLI token (available from hackathon sponsor resources).

---

### 4. Bryntum (Eligible for Dedicated $1,000 Sponsor Prize!)
- **What it is:** High-performance UI components for project planning, timeline scheduling, Gantt charts, TaskBoards, and calendars.
- **Role in PromisePay:**
  - Visualizes the **Promise Timeline & Milestone Schedule**:
    - Milestone 1: Requirement Specification & Deposit (PayPal Capture Pending).
    - Milestone 2: Initial Draft / Deliverable Evidence (Verification Window).
    - Milestone 3: Final Acceptance & Warranty Expiration (Release of funds / Authorized resolution).
  - Displays real-time progress, countdown to SLA deadlines, and dependency tracking between promises.
- **Benefits for the Project:**
  - Directly targets Bryntum's dedicated **$1,000 category prize** for applications combining scheduling/planning with payments.
  - Replaces boring text status with an interactive visual Gantt chart that immediately wows judges in the 3-minute video demo.
- **Implementation Blueprint:**
  - Integrate `@bryntum/gantt-react` or `@bryntum/scheduler-react` inside `apps/web/src/components/dashboard/PromiseGantt.tsx`.
  - Map Promise milestones and deadlines directly into Bryntum Task records.
- **User Action Required:** Bryntum trial npm package (publicly available via Bryntum's free developer trial repository or standard evaluation npm package).

---

### 5. Channel3
- **What it is:** Real-time product search API and Model Context Protocol (MCP) server providing structured, normalized catalog data across 100M+ products from 25,000+ retailers without scraping.
- **Role in PromisePay:**
  - Powers the **Physical Goods / E-Commerce Promise Verification**:
    - When a buyer creates a promise for a specific item (e.g. "Brand new Sony WH-1000XM5 in Black"), Channel3 provides ground-truth catalog specs, UPC codes, MSRP, and product details.
    - When the seller submits evidence (receipt, serial number, product photos), the AI agent compares the evidence against Channel3's verified specifications to prevent counterfeit goods or wrong-item shipments.
  - Enables an **AI Shopping & Escrow Assistant** that searches products via Channel3, initiates PayPal Checkout, and binds the purchase to an immutable Promise.
- **Benefits for the Project:**
  - Solves the physical goods validation challenge with authoritative catalog data.
  - Qualifies for Channel3 sponsor prize and demonstrates seamless MCP protocol usage.
- **Implementation Blueprint:**
  - Integrate Channel3 Python client or REST API in `services/api/promisepay_api/services/channel3_service.py`.
  - Add Channel3 MCP tool definition in the agent's toolset.
- **User Action Required:** Channel3 API Key (from hackathon partner dashboard).

---

### 6. Elastic
- **What it is:** Enterprise search and analytics engine providing hybrid search (keyword + vector embeddings) and log monitoring.
- **Role in PromisePay:**
  - **Dispute Precedent Search:** Vector embeddings of past resolved promises, disputes, and evidence allow the AI Arbiter to search: *"Find the top 3 similar past disputes regarding Next.js deployment delays and see how they were resolved."*
  - **Audit & Compliance Telemetry:** Full-text indexing of all PayPal webhook payloads, audit events, and hash logs for instant compliance search.
- **Benefits for the Project:**
  - Gives the AI agent historical memory and consistency in arbitration decisions.
  - Production-grade security and tamper-evident audit log search.
- **Implementation Blueprint:**
  - Index promise requirements and resolution summaries into an Elasticsearch index or vector store.
  - Add search query helper in `services/api/promisepay_api/services/elastic_service.py`.
- **User Action Required:** Elastic Cloud trial endpoint or credentials (free trial / hackathon partner link).

---

### 7. KERNEL
- **What it is:** Ultra-fast cloud headless browser infrastructure (<30ms spinup, anti-bot bypass, session replay, live 24fps streaming) built specifically for AI agents.
- **Role in PromisePay:**
  - **Autonomous Web Deliverable Verification:**
    - When a freelance developer submits a live website as evidence (e.g. `https://client-demo.vercel.app`), the PromisePay agent boots a KERNEL cloud browser.
    - The agent visits the URL, verifies that the site loads with HTTP 200, checks mobile responsiveness, confirms interactive elements (forms, buttons, PayPal button presence), takes high-res screenshots, and captures DOM snapshots as cryptographic evidence.
    - Saves a video replay of the verification session so both buyer and seller can watch the agent test the site.
- **Benefits for the Project:**
  - Solves the hardest problem in digital proof-of-work: independent, fraud-proof web verification.
  - Stunning visual proof in the video demo showing the agent actively testing the live product.
- **Implementation Blueprint:**
  - Add KERNEL client script in `services/api/promisepay_api/services/kernel_browser.py`.
  - Call KERNEL session API when evidence type is `URL` or `WEB_APP`.
- **User Action Required:** KERNEL API Key (from hackathon sponsor portal).

---

### 8. Postman
- **What it is:** The world's leading API development platform for designing, mocking, documenting, and automated testing of REST APIs.
- **Role in PromisePay:**
  - Complete, turnkey **Postman Collection & Environment** (`docs/PayPal_PromisePay.postman_collection.json`) covering:
    - PayPal Orders v2 Sandbox authentication, order creation, capture, and refund.
    - PromisePay API lifecycle: Create Promise, Upload Evidence, Trigger Verification, and Authorize Resolution.
    - Automated test scripts validating response codes, schema integrity, and webhook verification.
- **Benefits for the Project:**
  - Gives judges an instant "Run in Postman" button so they can test the API in under 60 seconds without running code locally.
  - Fulfills the requirement for rock-solid developer experience.
- **Implementation Blueprint:**
  - We already have the foundation in `docs/PayPal_PromisePay.postman_collection.json`.
  - Polish and expand with pre-request auth scripts, dynamic environment variables, and comprehensive test assertions.
- **User Action Required:** None (already scaffolded in the repository; user can import into their desktop Postman app).

---

### 9. Render
- **What it is:** Unified cloud application platform for zero-downtime web services, background workers, databases, and Docker workloads.
- **Role in PromisePay:**
  - Hosts the entire live production deployment:
    1. `promisepay-web`: Next.js 15 SSR frontend.
    2. `promisepay-api`: FastAPI backend container with automatic SSL and health check probes.
    3. `render.yaml` infrastructure-as-code for one-click blueprint deploys.
- **Benefits for the Project:**
  - Provides the live hosted URL required by hackathon submission rules.
  - Zero-maintenance staging and production environments.
  - Qualifies for Render credits and deployment showcase.
- **Implementation Blueprint:**
  - We have `render.yaml` in the root workspace.
  - Connect GitHub repository to Render and deploy via Blueprint.
- **User Action Required:** Render account linked to GitHub repository.

---

### 10. Zapier
- **What it is:** Leading workflow automation platform connecting 6,000+ business applications (Slack, Google Workspace, Jira, Salesforce, Discord, QuickBooks, etc.).
- **Role in PromisePay:**
  - **Omnichannel Business Event Automation:**
    - `Promise Created` → Zapier notifies buyer & seller on Slack / WhatsApp with promise agreement terms.
    - `Evidence Submitted` → Zapier logs record in merchant's Google Sheets / Airtable.
    - `AI Verification Complete (Review Required)` → Zapier creates an urgent Jira/Linear ticket for the arbitration team.
    - `Payment Resolved / Refunded` → Zapier triggers automated QuickBooks invoice update and email receipt.
- **Benefits for the Project:**
  - Connects PromisePay to the enterprise software ecosystem.
  - Demonstrates immediate commercial viability for SMBs and enterprise merchants.
- **Implementation Blueprint:**
  - Build a custom Webhook Outbox in `services/api/promisepay_api/routers/webhooks.py` with Zapier Catch Hook compatibility.
  - Provide ready-to-use Zapier templates/recipes in `docs/ZAPIER_INTEGRATION.md`.
- **User Action Required:** Free Zapier account (user creates a webhook trigger URL when configuring notifications).

---

## 4. Implementation Phasing & Priority Matrix

| Sponsor Tool | Impact on Judging | Complexity to Integrate | Prize Eligibility | Implementation Phase |
| :--- | :---: | :---: | :---: | :---: |
| **AG Grid** | ⭐⭐⭐⭐⭐ | Low (already in dependencies) | AG Grid Partner Award | **Phase 1 (Immediate)** |
| **Bryntum** | ⭐⭐⭐⭐⭐ | Medium | **$1,000 Bryntum Category Award** | **Phase 1 (Immediate)** |
| **Render** | ⭐⭐⭐⭐⭐ | Low (`render.yaml` ready) | Render Cloud Showcase | **Phase 1 (Immediate)** |
| **Postman** | ⭐⭐⭐⭐ | Low (collection in `docs/`) | Dev Tooling Best Practice | **Phase 1 (Immediate)** |
| **Zapier** | ⭐⭐⭐⭐⭐ | Low (Webhook Trigger) | Workflow Automation Showcase | **Phase 2 (Quick Win)** |
| **KERNEL** | ⭐⭐⭐⭐⭐ | Medium (API client + video capture) | Agent Innovation Differentiator | **Phase 2 (High Visuals)** |
| **APIMatic** | ⭐⭐⭐⭐ | Medium (OpenAPI to SDK export) | APIMatic Developer Prize | **Phase 2 (API Ecosystem)** |
| **Channel3** | ⭐⭐⭐⭐ | Medium (Catalog query API) | Channel3 Agentic Shopping Award | **Phase 3 (Vertical Polish)** |
| **Astropods** | ⭐⭐⭐⭐ | Medium (Agent runtime wrapper) | Agent OS Innovation | **Phase 3 (Agentic Safety)** |
| **Elastic** | ⭐⭐⭐⭐ | Medium (Vector/text index) | Search & AI Showcase | **Phase 3 (Search & Scale)** |

---

## 5. What is Needed from You (Credentials & Setup Checklist)

To begin wiring each tool into the codebase, here is the clear list of items. Most can be scaffolded immediately with clean local mocks and test adapters, but for live demos, having these API keys will enable 100% full live execution:

### Immediately Available (No action required from user):
1. ✅ **AG Grid:** Community package is already installed and runs locally out-of-the-box.
2. ✅ **Postman:** Collection file exists in `docs/` and works with local & sandbox servers.
3. ✅ **Render:** `render.yaml` blueprint is written and ready for 1-click deployment.
4. ✅ **Mock Adapters:** We can implement robust mock/sandbox adapters for all tools so the app runs smoothly even before external API keys are plugged in!

### Optional Sponsor API Keys (Provide whenever you have them):
1. 🔑 **Bryntum:** Standard free evaluation package or npm token (we can install the free trial package directly).
2. 🔑 **KERNEL API Key:** Needed for running headless browser verification in the cloud (otherwise local Playwright/Puppeteer adapter can be used as a drop-in fallback).
3. 🔑 **Channel3 API Key:** Needed for querying real-time retail product catalogs via MCP/REST.
4. 🔑 **Astropods API Key / Token:** Needed for connecting to the hosted Astropods agent dashboard.
5. 🔑 **Elastic Cloud Credentials:** Endpoint URL and API key (if using Elastic Cloud; otherwise local or mock vector search handles it).
6. 🔑 **Zapier Webhook URL:** A single "Catch Hook" URL from your Zapier account to see live Slack or email notifications fire during test runs.
7. 🔑 **APIMatic Account:** Needed only if you wish to host a public APIMatic developer portal under your personal APIMatic dashboard.

---

## 6. Execution Roadmap: Next Steps

1. **Step 1:** Commit this comprehensive specification to the repository as the architectural guide.
2. **Step 2:** Link this guide into `README.md` and `docs/ARCHITECTURE.md`.
3. **Step 3:** Implement **AG Grid** on the frontend dashboard to elevate the Promise Ledger and Evidence Review Matrix.
4. **Step 4:** Implement **Bryntum Gantt / Milestone Scheduler** component to target the **$1,000 Bryntum Category Award**.
5. **Step 5:** Implement **Zapier Webhook Outbox** in FastAPI to trigger external notifications and CRM actions on promise lifecycle events.
6. **Step 6:** Implement **KERNEL / Playwright Web Verification Service** to autonomously browse and verify digital deliverables.
7. **Step 7:** Enrich Postman collection and Render deployment configurations for zero-friction judge evaluation.
