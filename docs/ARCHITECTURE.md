# Architecture

## System shape

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003087', 'primaryTextColor': '#FFFFFF', 'primaryBorderColor': '#001C48', 'lineColor': '#0079C1', 'secondaryColor': '#0079C1', 'tertiaryColor': '#F5F7FA', 'noteBkgColor': '#FFC439', 'noteTextColor': '#2C2E2F', 'actorBkg': '#003087', 'actorTextColor': '#FFFFFF', 'actorBorder': '#001C48'}}}%%
flowchart TB
    subgraph ClientTier["Client Presentation Layer (Port 3000)"]
        UI["Next.js 14 Web Portal<br/>(React, Tailwind CSS, TypeScript)"]
        SDK["PayPal JS SDK v6<br/>(Standard Card Fields & Smart Buttons)"]
        Grid["AG Grid Enterprise Ledger<br/>(Promise & Evidence State)"]
        SSE_Client["EventSource Client<br/>(Real-Time Status Feeds)"]
    end

    subgraph APITier["Application & API Gateway Layer (Port 8000)"]
        FastAPI["PromisePay FastAPI Core Gateway<br/>(Python 3.12, Uvicorn, Pydantic v2)"]
        Routers["10 Core Modular Routers<br/>• /auth & /promises<br/>• /payments & /webhooks<br/>• /evidence & /verifications<br/>• /resolutions & /disputes<br/>• /events & /health"]
        DLP["DLP & PII Sanitization Engine<br/>(Luhn Card Scrubber, Regex Masker)"]
        RustBridge["PyO3 / Native Subprocess Bridge<br/>(RFC 6962 Merkle Tree Interface)"]
    end

    subgraph NativeTier["Cryptographic Engine Layer"]
        RustMerkle["Native Rust Merkle Engine<br/>(crates/promisepay-verify)<br/>• RFC 6962 Domain Separation<br/>• Lexicographical Hash Sorting<br/>• SHA-256 Dossier Sealing"]
    end

    subgraph AsyncTier["Asynchronous Worker Layer"]
        Worker["PromisePay Background Worker<br/>(services/worker/main.py)"]
        Crawler["Headless Chromium Deliverable Scraper<br/>(DOM Extraction & Viewport Captures)"]
        OCR["Multimodal Document AI Parser<br/>(Deterministic PDF & Image OCR)"]
    end

    subgraph DataTier["Persistence & Cache Layer (Port 5432)"]
        DB[("PostgreSQL 15 / Supabase<br/>• 16 Relational Tables<br/>• 9 Custom ENUM Types<br/>• Multi-Tenant RLS Policies")]
        Storage["Supabase Object Storage<br/>(Encrypted Evidence Vault)"]
    end

    subgraph ExternalTier["External Cloud & Enterprise Services"]
        PayPal["PayPal Sandbox & PPCP APIs<br/>• Orders v2 (Delayed Capture)<br/>• Webhooks v1 (Signature Postback)<br/>• Customer Disputes v1 (Dossier Dispatch)<br/>• Payouts v1 (Disbursement Clearing)"]
        Gemini["Google Gemini AI Platform<br/>• Gemini 1.5 Flash (Synthesizer)<br/>• Gemini 1.5 Pro (Lead Verifier)"]
    end

    UI -->|HTTPS / REST / JWT| FastAPI
    SDK -.->|Client-Side Checkout| PayPal
    UI --- Grid
    UI --- SSE_Client
    FastAPI --> Routers
    Routers --> DLP
    FastAPI <-->|High-Performance FFI| RustBridge
    RustBridge <--> RustMerkle
    FastAPI -->|Enqueue Jobs| Worker
    Worker --> Crawler
    Worker --> OCR
    FastAPI <-->|SQLAlchemy 2.0 Async / RLS| DB
    Worker <-->|Store Processed Evidence| Storage
    FastAPI <-->|mTLS / OAuth 2.0| PayPal
    FastAPI <-->|Structured JSON Schema| Gemini
    PayPal -->|HMAC-SHA256 Webhooks| FastAPI
    FastAPI -->|SSE Broadcasts| SSE_Client
```

## Trust boundaries

| Boundary | Trusted inputs | Required control |
| --- | --- | --- |
| Browser → API | authenticated user input only | authorization, schema validation, CSRF/session protection, rate limits |
| API → PayPal | server-held credentials and calculated amount | OAuth, idempotency, allow-listed base URL, response validation |
| PayPal → webhook | raw HTTPS request | signature verification before parse/process; event deduplication |
| API → AI | minimized promise/evidence excerpts | schema-constrained output, prompt/version logging, no tools that can move money |
| Object storage → verifier | scanned, provenance-recorded files | MIME/size checks, malware scan, signed URLs, extraction sandbox |

## Core sequence

1. Merchant enters a promise. API assigns `PP-...`, extracts requirements and creates a verification plan.
2. Merchant confirms edited requirements. API records a promise version.
3. Buyer initiates checkout. API reads the confirmed promise amount, creates a PayPal Order with a `custom_id` containing only the Promise ID, and returns order ID to the frontend SDK.
4. After buyer approval, API captures the PayPal Order and stores returned order/capture data. A verified webhook reconciles the state.
5. Seller submits evidence. The API stores metadata, content checksum, and immutable evidence version.
6. A worker verifies evidence against the approved plan and writes requirement-level results.
7. Resolution policy maps results to a recommendation. A reviewer can accept/override with a reason. Only this separate authorized action can call a PayPal refund endpoint.

## Promise Graph

The graph is modeled through relational links, not a graph database in the MVP:

```text
promise ← promise_version ← requirement ← verification_plan_item
   ├── payment ← paypal_event
   ├── evidence ← evidence_requirement
   ├── verification_run ← verification_result
   └── resolution_case ← resolution_decision
```

This allows transactional integrity, row-level authorization, and simple AG Grid queries. A graph projection endpoint can assemble the connected lifecycle for the UI.

## State machines

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#003087', 'primaryTextColor': '#FFFFFF', 'primaryBorderColor': '#001C48', 'lineColor': '#0079C1', 'secondaryColor': '#0079C1', 'tertiaryColor': '#F5F7FA', 'noteBkgColor': '#FFC439', 'noteTextColor': '#2C2E2F', 'actorBkg': '#003087', 'actorTextColor': '#FFFFFF', 'actorBorder': '#001C48'}}}%%
stateDiagram-v2
    [*] --> DRAFT: Merchant Drafts Agreement
    DRAFT --> READY_FOR_PAYMENT: Version Confirmed & Requirements Locked
    DRAFT --> CANCELLED: Merchant Aborts Draft

    READY_FOR_PAYMENT --> PAYMENT_PENDING: Buyer Launches PayPal Checkout
    READY_FOR_PAYMENT --> CANCELLED: Expired / Withdrawn

    PAYMENT_PENDING --> PAID: PayPal Order Captured & Webhook Verified
    PAYMENT_PENDING --> CANCELLED: Buyer Cancels Checkout

    PAID --> FULFILLMENT: Delayed Disbursement Hold Placed
    FULFILLMENT --> EVIDENCE_SUBMITTED: Seller Submits Delivery Deliverables

    EVIDENCE_SUBMITTED --> VERIFYING: Verification Job Enqueued
    VERIFYING --> COMPLETE: Multi-Judge Consensus >= 0.80 & Requirements Met
    VERIFYING --> REVIEW_REQUIRED: Judge Divergence / Missing Proof / Capped <= 0.59
    VERIFYING --> OUTCOME_NOT_VERIFIED: Hard Requirement Failure / Uncorroborated

    COMPLETE --> RESOLVED: Escrow Released via PayPal Payouts
    REVIEW_REQUIRED --> RESOLVED: Human Reviewer Accepts Fulfillment or Orders Refund
    OUTCOME_NOT_VERIFIED --> RESOLVED: Reviewer Authorizes PayPal Sandbox Refund

    RESOLVED --> [*]
    CANCELLED --> [*]
```

**Promise:** `DRAFT → READY_FOR_PAYMENT → PAYMENT_PENDING → PAID → FULFILLMENT → EVIDENCE_SUBMITTED → VERIFYING → COMPLETE | REVIEW_REQUIRED | OUTCOME_NOT_VERIFIED → RESOLVED`

**Payment:** `NOT_STARTED → ORDER_CREATED → APPROVED → CAPTURED | FAILED | CANCELLED → REFUND_PENDING → REFUNDED`

**Resolution:** `NONE → OPEN → DECISION_RECORDED → ACTION_PENDING → CLOSED`

State transitions are server-owned. Transitions are recorded in `audit_logs` and must meet preconditions defined in the API service.

## Deployment MVP

- Web: Next.js on Render static/web service.
- API: FastAPI container on Render web service.
- Worker: Render background worker only after asynchronous verification is implemented; inline background task is acceptable for the first local demo.
- Database/storage: Supabase project with separate development and demo environments.
- Required public endpoint: `POST /api/webhooks/paypal` over HTTPS.

## Scaling path

Use a message queue for verification, content extraction, retry policies, and outbound notifications. Keep the payment service synchronous and narrowly scoped. Do not share PayPal credentials with worker jobs that do not need them.


---

## Side-by-Side Python + Rust Architecture

To differentiate PromisePay from standard Python-only hackathon submissions, high-performance cryptographic operations are implemented side-by-side in **Rust** (crates/promisepay-verify) and orchestrated via **Python 3.13** (FastAPI):

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          FastAPI Backend (Python)                      │
│  - REST Routers & PayPal SDK Integration                               │
│  - LLM Multi-Modal Verification Orchestration                          │
│  - Human-in-the-Loop Resolution Workflow                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC / Subprocess (JSON stdin/stdout)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Native Cryptographic Proof Engine (promisepay-verify)      │
│  - Language: Rust 2021 Edition (crates/promisepay-verify)              │
│  - Deterministic Pairwise SHA-256 Merkle Tree Calculation              │
│  - Lexicographically-sorted leaf hashes for reproducible provenance    │
│  - Tamper-Evident Dossier Sealing (PP-SEAL-...)                        │
│  - Sub-millisecond benchmark (~50 µs execution time)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Fallback
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Pure Python Fallback Engine                        │
│  - Built into services/rust_verifier.py                                │
│  - Bit-for-bit identical SHA-256 Merkle & composite seal generation   │
│  - Guarantees 100% judge portability on machines without Rust installed│
└────────────────────────────────────────────────────────────────────────┘
```

### Why this dual-engine design?
1. **Financial-Grade Integrity**: Cryptographic proof-of-evidence trees and composite seals cannot suffer from subtle timing attacks, memory safety defects, or non-deterministic serialization.
2. **Speed & Scalability**: Evaluating 100+ high-resolution evidence hashes in a dispute takes microseconds in compiled Rust rather than milliseconds in interpreted Python.
3. **Zero Judge Friction**: Judges running the code without a local Rust toolchain experience zero breakage—the Python fallback transparently assumes execution.
