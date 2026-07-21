# KCCC V2.1 — Communications provider selection guide

**Scope:** D21 foundation + future D22 vendor registration  
**Status:** No production provider selected at D21 ship  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISPATCH_FOUNDATION_DELIVERABLE_21.md`

## Current state (D21 ship)

| Item | Value |
|------|-------|
| `KCCC_COMMUNICATIONS_PROVIDER_KEY` | **Unset** |
| Active adapter | `disabled` |
| Registered production providers | None (registry lists `disabled` only) |
| Test adapter `kccc-test` | Unit/integration tests only — **not selectable in production** |
| `applicationDispatchEnabled` | `false` on all connections |
| Kill switches | Default **ON** (blocking) |

**Do not** set `KCCC_COMMUNICATIONS_PROVIDER_KEY=kccc-test` in production Netlify env.

## What a provider is (and is not)

| Is | Is not |
|----|--------|
| Email or SMS vendor with API + webhooks | Mobilize (events/signups/attendance only) |
| Credential-tested outbound channel | Consent source |
| Source of delivery/bounce/complaint events | Audience materialization engine |
| Bounded batch recipient handler | Durable background queue |

Kelly Calendar selects **one active dispatch provider key** via env. Vendor-specific adapters register in code (planned D22) — unknown keys fail closed to `disabled`.

## Selection criteria (before D22)

When evaluating a vendor for Kelly SOS:

1. **Channels** — EMAIL and/or SMS as needed; clear sandbox vs production modes.
2. **Webhooks** — Signed delivery, bounce, complaint, and unsubscribe events with stable message IDs.
3. **Idempotency** — Vendor supports idempotent send or dedupe by client key.
4. **Suppression sync** — Ability to honor opt-out/complaint via webhook import (D21 path exists).
5. **Compliance** — Campaign-appropriate terms; no PII in logs beyond operational minimum.
6. **Operational fit** — Bounded batches (≤25) acceptable; no requirement for Kelly to run a worker fleet at D21.

## Environment configuration (future — not active at D21 ship)

When D22 registers a real adapter:

| Variable | Purpose |
|----------|---------|
| `KCCC_COMMUNICATIONS_PROVIDER_KEY` | Active provider key (e.g. vendor slug) |
| Vendor-specific secrets | API keys, webhook signing secrets — **Netlify env only**, never commit |

After setting env:

1. Leadership runs **verify connection** — writes `CommunicationProviderConnection` with verify timestamps.
2. Review capability snapshot in provider dashboard.
3. Keep `applicationDispatchEnabled: false` until production-readiness checklist complete.
4. Keep kill switches ON until explicit go-live authorization.

## Modes

| `CommProviderMode` | Meaning |
|--------------------|---------|
| `DISABLED` | No outbound requests (D21 default for connections) |
| `SANDBOX` | Credential test and limited send drill |
| `PRODUCTION` | Live recipient dispatch — requires all gates open |

Mode on connection record is operator-controlled in future passes; env key alone does not imply PRODUCTION.

## Gates that must all pass before live dispatch

1. D20 queue prepared with valid content + audience + **dispatch** approvals
2. Policy `externalDispatchEnabled: true`
3. Connection `applicationDispatchEnabled: true`
4. Provider verified (`configurationState` at least `VERIFIED`)
5. Kill switches OFF for target channel with documented reason
6. Preflight eligible for each queue item (consent, suppression, contact verified)
7. Production-readiness checklist signed off (see D21 deliverable doc)

## Test adapter (`kccc-test`)

| Environment | Behavior |
|-------------|----------|
| `NODE_ENV=test` / unit tests | Deterministic accept/reject/unknown scenarios |
| `NODE_ENV=production` | Resolves to `disabled` — cannot dispatch |
| Netlify production | **Never configure** |

Use test adapter only in local/CI validation. See `npm run missions:v21:communications-dispatch:validate`.

## Mobilize

Mobilize is **not** a communications provider candidate. Use Mobilize for event links in message **content** (D20) only.

See `KCCC_V2_1_PROVIDER_INTEGRATION_MOBILIZE_ARCHITECTURE.md`.

## Recommended D22

Register first vendor adapter, sandbox credential UX, and explicit promotion from `SANDBOX` to `PRODUCTION` — documented in a future revision of this guide.

## Related docs

- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_SECURITY.md`
- `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`
