-- ==============================================================================
-- PromisePay Development & Demo Seed Data
-- Synthetic demonstration records only — strictly no real personal data
-- ==============================================================================

-- 1. Demo Organization
INSERT INTO organizations (id, name, slug)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Acme Digital Labs', 'acme-labs')
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Users
INSERT INTO users (id, auth_user_id, display_name, email, avatar_url)
VALUES 
    ('10000000-0000-0000-0000-000000000001', 'auth_alice_buyer', 'Alice Buyer (Demo)', 'alice.buyer@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'),
    ('10000000-0000-0000-0000-000000000002', 'auth_bob_seller', 'Bob Merchant (Demo)', 'bob.merchant@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'),
    ('10000000-0000-0000-0000-000000000003', 'auth_carol_ops', 'Carol Reviewer (Demo)', 'carol.reviewer@example.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol')
ON CONFLICT (id) DO NOTHING;

-- 3. Organization Memberships
INSERT INTO organization_members (id, organization_id, user_id, role)
VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'BUYER'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'SELLER'),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'REVIEWER')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 4. Demo Promise 1: Digital Project (E-Commerce Web Application)
INSERT INTO promises (id, promise_id, organization_id, buyer_id, seller_id, title, category, status, amount_value, currency_code)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    'PP-DEMO1-2026',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'Next.js Headless E-Commerce Storefront',
    'DIGITAL_PROJECT',
    'PAID',
    450.00,
    'USD'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO promise_versions (id, promise_id, version, source_text, structured_promise, approved_by, approved_at)
VALUES (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    1,
    'Build and deploy a responsive Next.js storefront with customer authentication, product catalog, cart checkout, and production deployment on Vercel.',
    '{"title": "Next.js Headless E-Commerce Storefront", "scope": "Full responsive web application", "platform": "Next.js + Tailwind", "deliverables": ["GitHub repository", "Live deployment URL"]}',
    '10000000-0000-0000-0000-000000000002',
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO promise_requirements (id, promise_version_id, key, title, description, priority, verification_method)
VALUES 
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'REQ-DIGITAL-1', 'Responsive Storefront UI', 'Mobile-responsive catalog layout with working search and filter controls.', 1, 'URL_SCREENSHOT_ANALYSIS'),
    ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'REQ-DIGITAL-2', 'Shopping Cart & Checkout Flow', 'Interactive shopping cart supporting item quantity updates and cart summary.', 1, 'URL_FUNCTIONAL_AUDIT'),
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'REQ-DIGITAL-3', 'Public Repository & Deployment', 'Accessible Git repository and live HTTPS production URL.', 2, 'GIT_REPO_AND_DNS_CHECK')
ON CONFLICT (promise_version_id, key) DO NOTHING;

INSERT INTO payments (id, promise_id, paypal_order_id, paypal_capture_id, state, amount_value, currency_code, idempotency_key)
VALUES (
    '60000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '8XY82019AA120934K',
    '44D091243B590219M',
    'CAPTURED',
    450.00,
    'USD',
    'idem_seed_demo_payment_1'
) ON CONFLICT (id) DO NOTHING;

-- 5. Demo Promise 2: Professional Document (Security Whitepaper)
INSERT INTO promises (id, promise_id, organization_id, buyer_id, seller_id, title, category, status, amount_value, currency_code)
VALUES (
    '30000000-0000-0000-0000-000000000002',
    'PP-DEMO2-2026',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'SOC2 Type II Readiness & Threat Model Whitepaper',
    'PROFESSIONAL_DOCUMENT',
    'READY_FOR_PAYMENT',
    300.00,
    'USD'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO promise_versions (id, promise_id, version, source_text, structured_promise, approved_by, approved_at)
VALUES (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    1,
    'Comprehensive 15+ page security architecture document covering trust boundaries, STRIDE threat analysis, and access policies.',
    '{"title": "SOC2 Readiness Whitepaper", "page_count": 15, "sections": ["Executive Summary", "Architecture", "STRIDE Threat Model", "Remediation Plan"]}',
    '10000000-0000-0000-0000-000000000002',
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO promise_requirements (id, promise_version_id, key, title, description, priority, verification_method)
VALUES 
    ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', 'REQ-DOC-1', 'Required Security Sections', 'Includes Executive Summary, Architecture, STRIDE Threat Model, and Access Matrix.', 1, 'DOCUMENT_STRUCTURE_ANALYSIS'),
    ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', 'REQ-DOC-2', 'Minimum Length & Citations', 'Document contains at least 15 substantive pages and external citations.', 2, 'DOCUMENT_METRIC_CHECK')
ON CONFLICT (promise_version_id, key) DO NOTHING;

-- 6. Demo Promise 3: Delivery / Physical Item (Hardware Prototype Kit)
INSERT INTO promises (id, promise_id, organization_id, buyer_id, seller_id, title, category, status, amount_value, currency_code)
VALUES (
    '30000000-0000-0000-0000-000000000003',
    'PP-DEMO3-2026',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'IoT Development Sensor Kit Dispatch',
    'DELIVERY',
    'DRAFT',
    120.00,
    'USD'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO promise_versions (id, promise_id, version, source_text, structured_promise, approved_by, approved_at)
VALUES (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000003',
    1,
    'Express shipment of IoT sensor hardware kit with tracking number and signed delivery receipt.',
    '{"title": "IoT Dev Kit Shipment", "carrier": "FedEx", "service": "Priority Overnight"}',
    '10000000-0000-0000-0000-000000000002',
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO promise_requirements (id, promise_version_id, key, title, description, priority, verification_method)
VALUES 
    ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000003', 'REQ-DELIVERY-1', 'Valid Carrier Tracking', 'Verifiable carrier tracking number and dispatch status within 48h.', 1, 'CARRIER_TRACKING_ADAPTER'),
    ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000003', 'REQ-DELIVERY-2', 'Delivery Confirmation', 'Carrier status confirms delivered to recipient destination.', 1, 'CARRIER_DELIVERY_CONFIRM')
ON CONFLICT (promise_version_id, key) DO NOTHING;

