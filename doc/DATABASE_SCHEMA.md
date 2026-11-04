# Database schema

PostgreSQL via Supabase. Use UUID primary keys, `timestamptz`, `numeric(15,2)` for money, database constraints for state enums, and migrations for every change. Store currency with every amount.

## Tables

| Table | Purpose | Important fields |
| --- | --- | --- |
| `users` | authenticated people | `id`, `auth_user_id`, `display_name` |
| `organizations` | tenant boundary | `id`, `name`, `slug` |
| `organization_members` | roles | `organization_id`, `user_id`, `role` |
| `promises` | stable lifecycle root | `id`, `promise_id` unique, `organization_id`, `status`, `category`, `amount_value`, `currency_code` |
| `promise_versions` | approved agreement snapshots | `id`, `promise_id`, `version`, `source_text`, `structured_promise`, `approved_at` |
| `promise_requirements` | atomic outcomes | `id`, `promise_version_id`, `key`, `description`, `priority`, `verification_method` |
| `verification_plans` | AI-generated, human-approved proof plan | `id`, `promise_version_id`, `status`, `plan_json`, `model_metadata` |
| `evidence` | immutable submitted evidence version | `id`, `promise_id`, `kind`, `source_uri`, `storage_key`, `sha256`, `provenance_json`, `status` |
| `evidence_requirements` | evidence-to-requirement join | `evidence_id`, `requirement_id`, `declared_by_submitter` |
| `payments` | PayPal payment linkage | `id`, `promise_id`, `paypal_order_id` unique, `paypal_capture_id` unique nullable, `state`, `amount_value`, `currency_code` |
| `paypal_events` | de-duplicated webhook receipt | `id`, `paypal_event_id` unique, `payment_id`, `event_type`, `payload_digest`, `signature_status`, `processed_at` |
| `verification_runs` | reproducible analysis run | `id`, `promise_version_id`, `status`, `input_manifest`, `model_metadata`, `started_at`, `completed_at` |
| `verification_results` | result per requirement | `id`, `run_id`, `requirement_id`, `status`, `confidence`, `reasoning`, `missing_information`, `evidence_refs` |
| `resolution_cases` | human resolution workspace | `id`, `promise_id`, `status`, `opened_by`, `verification_run_id` |
| `resolution_decisions` | named human/business decision | `id`, `case_id`, `decision`, `reason`, `decided_by`, `authorized_at` |
| `audit_logs` | append-only material-event record | `id`, `organization_id`, `promise_id`, `actor_type`, `actor_id`, `event_type`, `before_hash`, `after_hash`, `metadata` |

## Key constraints

- `promises.promise_id` is globally unique and never reused. Format validation occurs in application and database check constraints.
- `(promise_id, version)` in `promise_versions` is unique; approved versions cannot be updated or deleted.
- `paypal_events.paypal_event_id` is unique, making webhook processing idempotent.
- A `payments` row must agree with its owning promise's amount/currency; only a service role may insert or change it.
- A resolution decision is immutable after it authorizes a financial operation. A later decision supersedes it through a new row.
- `verification_results.confidence` is constrained to `0 <= confidence <= 1`.
- Object storage keys are generated server-side, scoped by organization and evidence UUID, never supplied as arbitrary client paths.

## Relationships

```text
organizations 1─* organization_members *─1 users
organizations 1─* promises 1─* promise_versions 1─* promise_requirements
promises 1─* payments 1─* paypal_events
promises 1─* evidence *─* promise_requirements
promise_versions 1─* verification_runs 1─* verification_results
promises 1─* resolution_cases 1─* resolution_decisions
promises 1─* audit_logs
```

## Row-level access policy

- Every tenant-owned row has an organization relationship. Application requests receive only their membership's organization scope.
- Buyer/seller roles can see their own promise, payment summary, approved plan, and permitted evidence; they cannot see another organization's records.
- Only evidence submitters and authorized reviewers can retrieve signed evidence links.
- Only reviewer/business-authorizer roles can create resolution decisions or refunds.
- PayPal webhooks use a dedicated server connection and bypass user policies only after signature verification in the API layer.
- The service role is never exposed to the frontend.

## Retention and privacy

Keep the minimum content necessary to explain verification. Store content-derived excerpts separately from original uploads, with version and source reference. Support organization-level evidence retention/deletion policies; preserve legally required audit metadata while removing original content when permitted. Never put raw documents, PayPal secrets, tokens, or full webhook payloads in application logs.
