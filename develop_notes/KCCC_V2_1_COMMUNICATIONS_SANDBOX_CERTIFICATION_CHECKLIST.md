# KCCC V2.1 — Communications sandbox certification checklist

**Scope:** Certify provider adapters before production promotion  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`  
**Harness:** `kccc-sandbox` adapter + vendor sandbox credentials

Complete **all** items for the target adapter (`resend` at D22 ship). Certification runs in **sandbox only** — no production recipient addresses.

## Pre-flight

- [ ] Adapter registered in `provider-registry.ts`
- [ ] Env secrets present in Netlify (not repo) — verify connection succeeds
- [ ] `CommunicationProviderConnection.mode` = `SANDBOX`
- [ ] `applicationDispatchEnabled` = **false**
- [ ] Kill switches **ON**
- [ ] Certification recipients limited to vendor sandbox / team test inboxes

## Authentication & configuration

- [ ] **Auth** — Valid API key → verify succeeds; invalid/missing key → fail closed with redacted error
- [ ] **Inspect** — `credentialsPresent` true when env set; no secret values in response
- [ ] **Capability discovery** — `discoverCapabilities()` returns consistent flags after verify

## Outbound send

- [ ] **Send (accept)** — Sandbox send returns `ACCEPTED` + stable `providerMessageId`
- [ ] **Send (reject permanent)** — Invalid destination → `REJECTED`, `permanent: true`
- [ ] **Send (reject transient)** — Simulated rate limit → `REJECTED` or retryable category
- [ ] **Duplicate prevention** — Same `idempotencyKey` → no double send; reconcile returns original message ID
- [ ] **Timeout handling** — Slow vendor response → `UNKNOWN` when appropriate; no fabricated acceptance

## Inbound webhooks

- [ ] **Receive** — Webhook POST accepted at `/api/webhooks/communications/{providerKey}`
- [ ] **Webhook signature** — Valid signature → `VERIFIED`; invalid → `REJECTED` (401)
- [ ] **Timestamp** — Stale timestamp beyond tolerance → rejected
- [ ] **Replay protection** — Duplicate `replayFingerprint` → `DUPLICATE`, no double processing
- [ ] **Delivery** — Normalized `DELIVERED` event matches attempt by `providerMessageId`
- [ ] **Bounce** — Hard bounce → `BOUNCED` + suppression path (`INVALID_DESTINATION` where policy applies)
- [ ] **Complaint** — Complaint event → suppression evaluation (`COMPLAINT`)
- [ ] **Suppression** — Opt-out/unsubscribe → channel suppression idempotent

## Reliability & ordering

- [ ] **Retry** — Transient failure allows operator retry after reconcile (no duplicate send)
- [ ] **Failure recovery** — `UNKNOWN_OUTCOME` reconcile path returns vendor truth
- [ ] **Latency** — Dispatch completes within `DEFAULT_DISPATCH_TIMEOUT_MS` (10s) for sandbox drill
- [ ] **Ordering** — Multiple events for same message processed idempotently (delivery after bounce does not corrupt state)

## Integration gates (must remain blocking at D22)

- [ ] Preflight still blocks live dispatch (`dispatchAvailable: false` with documented codes)
- [ ] Production mode dispatch refused when connection not promoted
- [ ] `npm run missions:v21:communications-provider:validate` passes

## Sign-off

| Role | Name | Date | Adapter key |
|------|------|------|-------------|
| Engineering | | | |
| Campaign leadership | | | |

Certification **does not** enable production. Next step: `KCCC_V2_1_COMMUNICATIONS_PRODUCTION_ENABLEMENT_CHECKLIST.md` (separate authorization).

## Related

- `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_VALIDATION_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_HEALTH_DASHBOARD_GUIDE.md`
