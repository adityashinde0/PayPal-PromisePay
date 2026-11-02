# PayPal integration

## Supported MVP flow

PromisePay uses the current PayPal REST **Orders v2** API in the free Sandbox environment:

1. API creates a promise first and approves the amount/requirements.
2. Browser loads PayPal's current JavaScript SDK through the documented React SDK v6 integration.
3. Browser asks PromisePay API to create an order; API uses OAuth 2.0 to call `POST /v2/checkout/orders` with `intent: CAPTURE`.
4. Buyer approves in PayPal's UI.
5. Browser asks PromisePay API to capture that exact order; API calls `POST /v2/checkout/orders/{id}/capture`.
6. API persists capture response, then verified PayPal webhooks reconcile lifecycle events.

PayPal documents both `CAPTURE` and `AUTHORIZE` intents. The MVP intentionally uses `CAPTURE`: proof-of-outcome is a post-payment evidence layer. It does not purport to reserve or release money. A later controlled authorization experiment may use `AUTHORIZE`, respecting PayPal's documented 29-day authorization period and merchant/product eligibility. [Official Orders v2 guide](https://developer.paypal.com/api/rest/integration/orders-api)

## API boundaries

| Operation | Actor | Endpoint | Guard |
| --- | --- | --- | --- |
| OAuth access token | FastAPI only | `POST /v1/oauth2/token` | Client secret from server environment only |
| Create order | FastAPI only | `POST /v2/checkout/orders` | Server-derived amount and `PayPal-Request-Id` |
| Capture order | FastAPI only | `POST /v2/checkout/orders/{id}/capture` | Promise/order ownership and payment state check |
| Refund captured payment | FastAPI only | `POST /v2/payments/captures/{capture_id}/refund` | Explicit authorized resolution decision + idempotency |
| Verify webhook | FastAPI only | `POST /v1/notifications/verify-webhook-signature` (if using postback) | Original raw event/header fields + configured webhook ID |

The client never receives `PAYPAL_CLIENT_SECRET`, an OAuth bearer token, webhook ID, or arbitrary payment amount authority. PayPal advises making Orders v2 calls from the server, not directly in the browser. [Orders integration guidance](https://developer.paypal.com/api/rest/integration/orders-api)

## Required environment values

```dotenv
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

Use the official Developer Dashboard to create the Sandbox REST app plus Sandbox buyer/business accounts. Keep a separate set of environment variables for production; no production credential belongs in a hackathon demo.

## Order mapping

| PayPal field | PromisePay source | Rule |
| --- | --- | --- |
| `intent` | fixed service configuration | `CAPTURE` for MVP |
| `purchase_units[0].amount` | approved promise version | server-calculated; no client override |
| `purchase_units[0].reference_id` | internal payment UUID | not a customer-controlled string |
| `purchase_units[0].custom_id` | Promise ID | public-safe identifier only; never PII or agreement text |
| `purchase_units[0].description` | short sanitized title | no sensitive evidence/terms |
| `PayPal-Request-Id` | generated per logical operation | persisted for idempotency |

Validate the response `id`, status, currency, amount, and purchase-unit reference before writing payment state. Do not trust the browser's claimed success state without a server response or verified webhook.

## Webhook design

Subscribe to precisely the events needed for the implemented flow, then confirm exact names in the Dashboard/current documentation. Candidate events include order approval and payment capture/refund outcomes. Treat capture API response as immediate UX feedback; use the verified webhook as durable asynchronous reconciliation.

Webhook handler:

1. Read raw request bytes and relevant PayPal headers before JSON parsing.
2. Verify signature using local cryptographic verification or PayPal's verification endpoint. PayPal documents both methods; postback verification is not available for webhook simulator mock events. [Webhook guide](https://developer.paypal.com/api/rest/webhooks/rest/)
3. Reject/quarantine failed verification; it must make no business state change.
4. In one transaction, insert unique PayPal event ID, correlate known payment/order IDs, update state if transition is valid, append audit event.
5. Return 2xx only after durable acceptance. PayPal retries non-2xx delivery attempts.

## Refund policy

The Payments v2 API supports refunds of captured payments. PromisePay may demonstrate a Sandbox refund only after a reviewer records a reasoned decision. AI output may propose `RECOMMEND_REFUND` but cannot invoke the endpoint, set an amount, or determine legal entitlement. [Payments v2 reference](https://developer.paypal.com/api/payments/v2)

## Test matrix

- Successful Sandbox create/approve/capture, duplicate capture attempt, declined/cancelled checkout, timeout/retry, webhook resend, invalid signature, duplicate webhook event, refund, and duplicate refund intent.
- Use PayPal webhook simulator only to validate listener/signature handling; label simulator events separately from real Sandbox transaction events.
- Run PayPal negative-testing scenarios when available, and record result screenshots/log correlations without leaking credentials.

## References

- [Orders API integration](https://developer.paypal.com/api/rest/integration/orders-api)
- [Payments v2 reference](https://developer.paypal.com/api/payments/v2)
- [Webhooks overview](https://developer.paypal.com/api/rest/webhooks/)
- [Integrate webhooks](https://developer.paypal.com/api/rest/webhooks/rest/)
- [PayPal security guidelines](https://developer.paypal.com/security-guidelines)
- [Next.js Checkout guide](https://developer.paypal.com/guides/nextjs-checkout)
