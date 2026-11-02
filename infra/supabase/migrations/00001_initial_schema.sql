-- ==============================================================================
-- PromisePay Initial Schema Migration
-- Matches doc/DATABASE_SCHEMA.md
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
    CREATE TYPE promise_status AS ENUM (
        'DRAFT',
        'READY_FOR_PAYMENT',
        'PAYMENT_PENDING',
        'PAID',
        'FULFILLMENT',
        'EVIDENCE_SUBMITTED',
        'VERIFYING',
        'COMPLETE',
        'REVIEW_REQUIRED',
        'OUTCOME_NOT_VERIFIED',
        'RESOLVED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_state AS ENUM (
        'NOT_STARTED',
        'ORDER_CREATED',
        'APPROVED',
        'CAPTURED',
        'FAILED',
        'CANCELLED',
        'REFUND_PENDING',
        'REFUNDED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM (
        'BUYER',
        'SELLER',
        'REVIEWER',
        'ADMIN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE promise_category AS ENUM (
        'DIGITAL_PROJECT',
        'PROFESSIONAL_DOCUMENT',
        'DELIVERY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM (
        'PENDING',
        'RUNNING',
        'COMPLETE',
        'REVIEW_REQUIRED',
        'OUTCOME_NOT_VERIFIED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE requirement_status AS ENUM (
        'PENDING',
        'VERIFIED',
        'PARTIALLY_VERIFIED',
        'UNSUPPORTED',
        'CONTRADICTED',
        'REVIEW_REQUIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE evidence_kind AS ENUM (
        'URL_SNAPSHOT',
        'DOCUMENT_FILE',
        'IMAGE_SCREENSHOT',
        'GIT_REPOSITORY',
        'TRACKING_REFERENCE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE resolution_case_status AS ENUM (
        'NONE',
        'OPEN',
        'DECISION_RECORDED',
        'ACTION_PENDING',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE resolution_decision_type AS ENUM (
        'APPROVE_FULFILLMENT',
        'APPROVE_REFUND',
        'PARTIAL_REFUND',
        'REJECT_CLAIM',
        'REQUEST_ADDITIONAL_EVIDENCE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id TEXT UNIQUE,
    display_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Organization Members
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'BUYER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

-- 4. Promises
CREATE TABLE IF NOT EXISTS promises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_id TEXT UNIQUE NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category promise_category NOT NULL,
    status promise_status NOT NULL DEFAULT 'DRAFT',
    amount_value NUMERIC(15, 2) NOT NULL CHECK (amount_value > 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT promise_id_format_check CHECK (promise_id ~ '^PP-[A-Z0-9]{4,12}-\d{4}$')
);

-- 5. Promise Versions (Immutable approved agreement snapshots)
CREATE TABLE IF NOT EXISTS promise_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_id UUID NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    source_text TEXT NOT NULL,
    structured_promise JSONB NOT NULL DEFAULT '{}'::jsonb,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (promise_id, version)
);

-- 6. Promise Requirements (Atomic outcomes)
CREATE TABLE IF NOT EXISTS promise_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_version_id UUID NOT NULL REFERENCES promise_versions(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 1,
    verification_method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (promise_version_id, key)
);

-- 7. Verification Plans
CREATE TABLE IF NOT EXISTS verification_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_version_id UUID NOT NULL REFERENCES promise_versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'APPROVED',
    plan_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Evidence
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_id UUID NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    kind evidence_kind NOT NULL,
    source_uri TEXT,
    storage_key TEXT,
    sha256 VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    provenance_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Evidence Requirements Join
CREATE TABLE IF NOT EXISTS evidence_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES promise_requirements(id) ON DELETE CASCADE,
    declared_by_submitter BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (evidence_id, requirement_id)
);

-- 10. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_id UUID NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
    paypal_order_id TEXT UNIQUE NOT NULL,
    paypal_capture_id TEXT UNIQUE,
    state payment_state NOT NULL DEFAULT 'ORDER_CREATED',
    amount_value NUMERIC(15, 2) NOT NULL CHECK (amount_value > 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    idempotency_key TEXT,
    raw_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. PayPal Events (Webhook receipts for idempotent processing)
CREATE TABLE IF NOT EXISTS paypal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paypal_event_id TEXT UNIQUE NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload_digest VARCHAR(64) NOT NULL,
    signature_status TEXT NOT NULL DEFAULT 'VERIFIED',
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Verification Runs
CREATE TABLE IF NOT EXISTS verification_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_version_id UUID NOT NULL REFERENCES promise_versions(id) ON DELETE CASCADE,
    status verification_status NOT NULL DEFAULT 'PENDING',
    input_manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 13. Verification Results
CREATE TABLE IF NOT EXISTS verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES verification_runs(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES promise_requirements(id) ON DELETE CASCADE,
    status requirement_status NOT NULL DEFAULT 'PENDING',
    confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 1.00),
    reasoning TEXT NOT NULL,
    missing_information TEXT[] DEFAULT '{}',
    evidence_refs UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Resolution Cases
CREATE TABLE IF NOT EXISTS resolution_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promise_id UUID NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
    status resolution_case_status NOT NULL DEFAULT 'OPEN',
    opened_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verification_run_id UUID REFERENCES verification_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Resolution Decisions
CREATE TABLE IF NOT EXISTS resolution_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES resolution_cases(id) ON DELETE CASCADE,
    decision resolution_decision_type NOT NULL,
    reason TEXT NOT NULL,
    refund_amount NUMERIC(15, 2) CHECK (refund_amount IS NULL OR refund_amount >= 0),
    paypal_refund_id TEXT,
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Audit Logs (Immutable append-only ledger)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    promise_id UUID REFERENCES promises(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    before_hash VARCHAR(64),
    after_hash VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & lookups
CREATE INDEX IF NOT EXISTS idx_promises_org_status ON promises(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_promises_promise_id ON promises(promise_id);
CREATE INDEX IF NOT EXISTS idx_promise_versions_promise_id ON promise_versions(promise_id);
CREATE INDEX IF NOT EXISTS idx_payments_promise_id ON payments(promise_id);
CREATE INDEX IF NOT EXISTS idx_payments_paypal_order_id ON payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_paypal_events_event_id ON paypal_events(paypal_event_id);
CREATE INDEX IF NOT EXISTS idx_evidence_promise_id ON evidence(promise_id);
CREATE INDEX IF NOT EXISTS idx_verification_runs_version_id ON verification_runs(promise_version_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_run_id ON verification_results(run_id);
CREATE INDEX IF NOT EXISTS idx_resolution_cases_promise_id ON resolution_cases(promise_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_promise_id ON audit_logs(promise_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

