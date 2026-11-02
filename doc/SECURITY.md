# Security

## Security posture

PromisePay is payment-adjacent. The MVP minimizes authority: AI has none over funds; browser inputs cannot dictate payment amounts; webhooks are untrusted until verified; resolution actions are human authorized and auditable.

## Threat controls

| Threat | Control |
| --- | --- |
| Secret exposure | Keep PayPal secret, OAuth tokens, database service role, and AI credentials server-side; use local untracked env files and managed deployment secrets |
| Price/order tampering | Derive Orders v2 purchase units from approved database records; validate response amount/currency/order ownership |
| Duplicate payment/refund | `PayPal-Request-Id`, local idempotency table, unique PayPal IDs, transactional state transitions |
| Forged/replayed webhook | HTTPS, raw-body signature validation, configured webhook ID, event-ID uniqueness, timestamp monitoring, audit log |
| AI prompt injection | Treat evidence as data, disable financial tools, strict JSON schema, reference validation, human review fallback |
| Unsafe files/URLs | Signed uploads, size/MIME allow-list, malware scan, isolated extraction, checksum; SSRF/private-network guard for URL fetches |
| Tenant data leak | Supabase RLS, organization-scoped queries, signed URLs with short expiry, role checks, no service role in browser |
| Unauthorized financial action | Separate business-authorizer permission, state-machine preconditions, confirm screen, reason, immutable decision/audit |
| Sensitive log leakage | Structured redaction, no tokens/credentials/raw uploads in logs, restricted audit viewer |
| Availability/retry failure | Timeouts, bounded retries, queue for verification, webhook idempotency, health checks, alerting |

## Mandatory controls before demo deployment

1. Enforce HTTPS; PayPal requires TLS 1.2 or higher for secure communications.
2. Verify every PayPal webhook signature on the server before it affects state.
3. Put all secrets in Render/Supabase secret management; rotate any credential that reaches chat, source control, logs, or screenshots.
4. Enable database backups and migration discipline; restrict database/dashboard access with MFA.
5. Set CSP, secure cookies, CSRF protection for cookie sessions, CORS allow-list, request-size limits, rate limits, and security headers.
6. Conduct secret scan, dependency audit, authorization tests, webhook negative tests, upload abuse tests, and manual payment/refund replay tests.

## Incident response MVP

- Disable the relevant payment/refund feature flag and revoke exposed PayPal credentials.
- Preserve audit identifiers and hashes; do not mutate historic events.
- Quarantine suspicious evidence/webhooks; mark linked cases for review.
- Assess affected records, rotate secrets, patch, test, and document the incident before re-enabling.

## PayPal implementation rules

Follow PayPal's current [security guidelines](https://developer.paypal.com/security-guidelines): validate webhook signatures, use HTTPS, never expose secrets client-side, keep dependencies current, and avoid logging sensitive payment data. The integration is Sandbox-only for hackathon use.
