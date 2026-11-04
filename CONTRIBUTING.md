# Contributing

## Principles

- Keep the project honest: no AI-controlled money movement, no claims beyond evidence, and no production-readiness claims from a Sandbox demo.
- Preserve a functional, installable project and update docs/tests with changes.
- Never commit credentials, real customer data, test-account passwords, or proprietary evidence.

## Workflow

1. Create a focused branch and issue/task describing the user impact and security implications.
2. Add or update tests before merging behavior changes.
3. Run the quality gates in [TESTING.md](doc/TESTING.md).
4. Update API/OpenAPI, database migration, and documentation when contracts change.
5. Request review for payments, authorization, AI policy, evidence handling, or data-model changes.

## Code and product rules

- Payment amounts and PayPal actions are server-owned.
- Every financial state transition uses idempotency and audit logging.
- AI output must conform to the defined schema and cite existing evidence IDs.
- New evidence types need a provenance, retention, and verification plan.
- Prefer accessible, plain language in UI; distinguish `evidence supports` from `proved in reality`.

## External code and resources

Use only code/assets you are licensed to use. The project may adapt patterns from official PayPal documentation and its official sample repositories, but contributors must preserve notices and verify licenses. Do not copy random checkout, webhook, or AI-agent snippets without a security review. Link the source in the pull request and record material design changes in [DECISIONS.md](doc/DECISIONS.md).

## Reporting a security issue

Do not open a public issue with a credential or exploit path. Before the repository is made public, enable GitHub private vulnerability reporting and publish the maintainer contact in the repository Security tab. Until then, use the team's agreed private channel. Rotate any credential accidentally exposed in an issue, commit, screenshot, or demo immediately.
