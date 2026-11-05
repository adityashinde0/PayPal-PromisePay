# Demo Guide & Judge Walkthrough

## Judge-Ready Verification Path

The end-to-end demo runs against the **PayPal Sandbox** and demonstrates a complete, working product—not a mock checkout or static prototype. This guide provides fresh-clone instructions, non-secret judge account workflows, and an under-three-minute rehearsal path as required by the [PayPal AI Hackathon Rules](https://paypalaihackathon.devpost.com/rules).

---

## 🚀 Quickstart: Fresh Clone in Under 2 Minutes

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node 20 / 22)
- **Python**: 3.11+ (tested on Python 3.13)
- **Git**

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/promisepay/paypal-promisepay.git
cd paypal-promisepay

# Copy environment template
cp .env.example .env

# Install dependencies
npm install
pip install -r requirements.txt
```

### 3. Launch Services
Open two terminal tabs:

**Terminal 1 (Backend API & Observability):**
```bash
npm run dev:api
# API runs on http://localhost:8000
# OpenAPI Docs: http://localhost:8000/docs
# Prometheus Metrics: http://localhost:8000/metrics
```

**Terminal 2 (Web Client & AG Grid Ledger):**
```bash
npm run dev:web
# Web UI runs on http://localhost:3000
```

---

## 🧪 Pre-Seeded Judge Scenarios

PromisePay boots with **three canonical, pre-seeded scenarios** representing different commercial outcome types:

| Scenario | Promise ID | Category | Amount | State | What it Demonstrates |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Next.js Storefront** | `PP-DEMO1-2026` | Digital Project | $450.00 USD | `PAID` / `COMPLETE` | Live deployment URL, Git repo, and screenshot proof verified by AI with high confidence ($> 90\%$). |
| **2. SOC2 Audit Report** | `PP-DEMO2-2026` | Pro Document | $300.00 USD | `READY_FOR_PAYMENT` | Checkout-ready. Pre-staged 12-page PDF intentionally missing the "Access Matrix" section ($12 < 15$ pages), producing `REVIEW_REQUIRED` and open adjudication case. |
| **3. IoT Sensor Kit** | `PP-DEMO3-2026` | Physical Delivery | $120.00 USD | `DRAFT` | Merchant drafting flow with UPS Express tracking adapter. Proves delivery status while establishing clear AI boundaries (does not guarantee item condition). |

> **Judge Tip:** Click the **🔄 Reset Demo Scenarios** button at the top of the Promise Ledger anytime to re-initialize all promises, evidence items, and resolution cases back to clean defaults!

---

## ⏱️ Five-Step Core Walkthrough (Under 3 Minutes)

### Step 1: Browse the Enterprise AG Grid Ledger (0:00 - 0:35)
1. Open `http://localhost:3000`.
2. Inspect the **AG Grid Promise Ledger**:
   - Filter by category (**Digital Project**, **Professional Document**, **Delivery**).
   - Test column sorting on Amount, Status, and Confidence.
   - Use the **Quick Search** input to instantly filter rows.
   - Observe the live KPI cards: Captured payments, AI verified outcomes, and review gates.

### Step 2: Create a Promise & Confirm Merchant Plan (0:35 - 1:10)
1. Click **+ Create Promise** (`/create`).
2. Select **Digital Project**, enter an amount ($500.00 USD), and write an agreement prompt:
   > *"Build a responsive Next.js frontend with user authentication and Stripe checkout deployed to Vercel."*
3. Click **Generate Promise**:
   - The structured AI extraction engine breaks free text into atomic requirements (`REQ-1`, `REQ-2`, `REQ-3`) with verification plans.
4. Click **Confirm Requirements**:
   - Merchant approval locks the version and transitions the promise to `READY_FOR_PAYMENT`.

### Step 3: PayPal Sandbox Payment Capture (1:10 - 1:45)
1. View the Promise Graph for your promise.
2. In the **PayPal Checkout** card, click the PayPal button or trigger Sandbox approval.
3. Observe:
   - Order creation and capture happen strictly server-side (`POST /payment-orders`).
   - PayPal Order ID (`8XY...`) and Capture ID (`44D...`) are transactionally linked to the immutable Promise ID.
   - Lifecycle moves to `PAID`.

### Step 4: Submit Proof & Explainable AI Verification (1:45 - 2:25)
1. Click **+ Submit Proof** in the Evidence Vault:
   - Submit a live URL or repository (`https://demo-storefront.promisepay.dev`).
   - Notice the automatic SHA-256 cryptographic provenance, MIME type verification, and anti-SSRF protections.
2. Click **Run AI Verification**:
   - Observe the explainable AI verification run:
     - Requirement-by-requirement status pills (`VERIFIED`, `PARTIALLY_VERIFIED`, `REVIEW_REQUIRED`).
     - Evidence IDs cited in every single claim.
     - Confidence meter with deterministic bounds (capped at $\le 0.59$ for uncorroborated items).
     - Transparent limitations and gap warnings.

### Step 5: Human Review & Human-Gated Sandbox Refund (2:25 - 2:55)
1. Navigate to `PP-DEMO2-2026` or open a resolution case.
2. View the **Human Review & Resolution Center**:
   - Review the discrepancy flagged by AI (missing section / page count gap).
   - Note the **concrete security boundary**: AI only recommends; it **never moves money**.
3. As the reviewer, select **RECOMMEND_REFUND** and record mandatory human justification notes.
4. Click **Issue PayPal Sandbox Refund**:
   - Confirm in the modal.
   - The server issues an idempotent PayPal Payments v2 refund (`POST /v2/payments/captures/{id}/refund`), persists the refund ID, and updates the immutable audit trail.


### Step 6: Dispute Defense Dossier & Rust Cryptographic Sealing (2:55 - 3:15)
1. On any promise page (e.g. PP-DEMO1-2026), click the **🛡️ Export Dispute Dossier** button in the header card.
2. The browser immediately downloads dispute_dossier_PP-DEMO1-2026.json.
3. Open the downloaded JSON:
   - Inspect cryptographicProof: Contains the tamper-evident composite seal (PP-SEAL-...), pairwise SHA-256 Merkle root, and engine signature (
ust-promisepay-verify).
   - Execution benchmark: Computed in ~50 microseconds by the compiled Rust binary with deterministic Python fallback for 100% portability.
   - Contains all PayPal Order IDs, Capture IDs, immutable evidence SHA-256 digests, and AI requirement verification results ready for PayPal Resolution Center submission.

---

## 📦 Developer Assets & Submission Exports

- **OpenAPI 3.1 Specification**: [`openapi.json`](openapi.json) (120+ KB complete schema).
- **Postman Collection v2.1.0**: [`PayPal_PromisePay.postman_collection.json`](PayPal_PromisePay.postman_collection.json) (pre-configured requests and environments for all 20+ endpoints).
- **Prometheus Metrics**: `GET http://localhost:8000/metrics`.
- **System Health & Diagnostics**: `GET http://localhost:8000/health/detailed`.

---

## 🛠️ PayPal Sandbox Test Credentials

When testing manual PayPal checkout in Sandbox popups:
- **Sandbox Environment**: `https://api-m.sandbox.paypal.com`
- **Buyer Test Account**: Use any Sandbox Personal account created in your PayPal Developer Dashboard, or test via the server-side mock capture fallback when offline.
- **Merchant Test Account**: Configured via `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `.env`.
