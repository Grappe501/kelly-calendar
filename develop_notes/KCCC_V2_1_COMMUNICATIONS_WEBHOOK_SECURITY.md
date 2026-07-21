# KCCC V2.1 — Communications webhook security

**Scope:** D21 provider webhook ingress  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISPATCH_FOUNDATION_DELIVERABLE_21.md`

## Purpose

Define how Kelly Calendar accepts, verifies, deduplicates, and processes inbound provider webhooks (delivery, bounce, complaint, unsubscribe) without exposing secrets, retaining unnecessary raw payloads, or creating fabricated delivery state.

## Fail-closed rules

| Rule | Behavior |
|------|----------|
| Unknown provider key | HTTP 404 — webhook not registered |
| `disabled` adapter | HTTP 404 |
| Test adapter in production | Not registered for production webhooks |
| Invalid signature | HTTP 401 — receipt stored as `REJECTED` |
| Replay fingerprint duplicate | HTTP 200 `{ duplicate: true }` — no reprocessing |
| Unsigned payload | Rejected — `signatureValid: false` |

Webhook routes never trust client-supplied message IDs without signature verification first.

## Verification model

Each registered provider adapter implements:

1. **`verifyWebhook`** — validate signature/timestamp, compute `replayFingerprint`, extract `providerEventId`
2. **`normalizeWebhook`** — map vendor events to normalized delivery events

D21 test adapter uses HMAC-SHA256 (`x-kccc-timestamp` + `x-kccc-signature`) for unit tests. Production vendors implement vendor-specific verification in D22 adapters.

Shared utilities: `verifyHmacSha256Signature`, timestamp tolerance (`DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300`).

## Replay protection

Every verified webhook computes a deterministic **`replayFingerprint`**. Stored in `CommunicationWebhookReceipt` with unique constraint.

Duplicate fingerprints return success without double-applying suppressions or delivery events.

## Payload retention

| Stored | Not stored (ordinary receipts) |
|--------|--------------------------------|
| Provider key, event ID, timestamps | Full raw body in long-term tables |
| Signature valid flag | Destination addresses / phone numbers |
| Processing status, match IDs | Message subject/body |
| Normalized event count | Unredacted PII |

Rejected webhooks: `purgeAfter` ≈ 7 days. Processed/unmatched: ≈ 30 days (operational audit window).

## Processing outcomes

| `CommWebhookProcessingStatus` | Meaning |
|-------------------------------|---------|
| `RECEIVED` | Initial (transient) |
| `VERIFIED` | Signature passed |
| `REJECTED` | Signature failed or malformed |
| `PROCESSED` | Matched to dispatch attempt |
| `DUPLICATE` | Replay fingerprint seen |
| `UNMATCHED` | Verified but no attempt match |
| `UNSUPPORTED` | Event type not handled |

## Event normalization semantics

| Normalized event | Kelly action |
|------------------|--------------|
| `DISPATCH_ACCEPTED` | Delivery event — **not** inbox delivery |
| `DELIVERED` | Delivery event when vendor confirms |
| `UNSUBSCRIBED` / opt-out | May create channel suppression |
| `COMPLAINT` | May create all-channel suppression |
| Hard bounce / invalid destination | May create suppression (`BOUNCE` / `INVALID_DESTINATION`) |
| Temporary bounce | **No** automatic suppression (`TEMPORARY_NO_SUPPRESSION`) |
| `UNSUPPORTED` | Logged only |

Suppression creation uses D20 `createSuppression` with source `PROVIDER_WEBHOOK:{providerKey}` — idempotent where possible.

Delivery events write to `CampaignCommunicationDeliveryEvent` with `source: PROVIDER` — duplicate provider event IDs ignored.

## Matching attempts

Webhooks match dispatch attempts by **`providerMessageId`** from normalized events. Unmatched verified webhooks remain auditable as `UNMATCHED` — operators investigate via webhook history.

## Operator responsibilities

1. Register webhook URL with vendor using HTTPS production endpoint only.
2. Store signing secret in Netlify env — rotate on compromise.
3. Monitor webhook history for elevated `REJECTED` or `UNMATCHED` rates.
4. Do not disable signature verification for convenience.
5. Treat webhook-driven suppressions as authoritative for future dispatch preflight.

## Test adapter (non-production)

`kccc-test` webhooks valid only outside production. Use `signTestWebhook` / `verifyTestAdapterWebhook` in tests — do not reuse test secrets in production.

## Related docs

- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md`
- `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`
