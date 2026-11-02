# Demo guide

## Judge-ready path

The end-to-end demo must run against PayPal Sandbox and demonstrate a real working product—not a mock checkout or static prototype. Prepare a public hosted URL or fresh-clone instructions, test credentials, and a non-secret judge account flow as required by the [hackathon rules](https://paypalaihackathon.devpost.com/rules).

## Pre-demo setup

1. Deploy the web app and API with an HTTPS public webhook endpoint.
2. Configure the PayPal Sandbox REST app, webhook listener, and Sandbox buyer/business test accounts.
3. Seed three synthetic promises: website, document, and delivery.
4. Pre-stage synthetic evidence for each scenario; keep one deliberate gap for the document scenario.
5. Open the Promise Ledger and the PayPal Sandbox activity/test account view in separate tabs.
6. Confirm webhook test endpoint, browser popup permissions, and correlation IDs are working.

## Five-step core walkthrough (about 2 minutes)

1. **Create context:** Create a website promise from plain language. Show AI extraction into editable requirements and verification plan. Approve it as merchant.
2. **Pay with PayPal:** Start checkout and complete a genuine Sandbox buyer approval/capture. Show PayPal order/capture ID appearing against the same Promise ID; never display secret values.
3. **Submit proof:** As seller, attach live URL/repository/screenshot evidence. Show provenance metadata and linked requirements.
4. **Explain verification:** Run or open completed analysis. Show a verified requirement, a partial requirement, evidence IDs, confidence band, reasoning, and limitations.
5. **Resolve responsibly:** Open review; show that the system recommends but a named reviewer decides. If demonstrating refund, explicitly show confirmation/reason and the Sandbox-only action.

## Category backup paths

- **Document:** upload a synthetic report that intentionally lacks one required section. Result must be `REVIEW_REQUIRED` with exact missing information.
- **Delivery:** attach synthetic tracking/confirmation evidence. Show its limitation: it supports delivery status but does not verify item condition.

## Three-minute recording outline

| Time | What to show |
| --- | --- |
| 0:00–0:20 | Problem and one-sentence PromisePay definition, then open product |
| 0:20–0:50 | Promise creation and AI plan confirmation |
| 0:50–1:20 | PayPal Sandbox checkout/capture and linked Promise ID |
| 1:20–2:10 | Evidence submission and explainable verification |
| 2:10–2:40 | Human-gated resolution and Promise Ledger/Audit trail |
| 2:40–3:00 | Three-category scope and concrete security boundary: AI never moves money |

Record the actual interface in the target device/browser. Do not rely on slides, a static prototype, copyrighted music, or unlicensed third-party marks. Keep the video publicly visible on YouTube and below three minutes, as the rules require.

## Troubleshooting

- If webhooks are delayed, show the capture response and pending-reconciliation status; do not fake completion.
- If sandbox checkout is unavailable, switch to the pre-tested backup Sandbox account only; never substitute a mock and call it real.
- If an AI provider is unavailable, show deterministic prechecks and a transparent `REVIEW_REQUIRED` failure state.
- If the refund demo is not reliable, omit it and show the authorization gate; it is not required for proof-of-outcome.
