# KCCC V2.1 — Communications webhook validation guide

**Scope:** D22 signed webhook drills for provider adapters  
**Parent:** `KCCC_V2_1_COMMUNICATIONS_PROVIDER_INTEGRATION_DELIVERABLE_22.md`  
**Security baseline:** `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_SECURITY.md`

## Purpose

Validate that inbound provider webhooks are authenticated, timely, deduplicated, and normalized before any production promotion. Webhooks are the **authoritative source** for delivery, bounce, and complaint facts — never trust client-supplied IDs without verification.

## Endpoint

```
POST /api/webhooks/communications/{providerKey}
```

| Rule | Behavior |
|------|----------|
| Unknown `providerKey` | 404 |
| `disabled` | 404 |
| Missing/invalid signature | 401, receipt `REJECTED` |
| Valid duplicate replay | 200 `{ duplicate: true }` |
| Session cookie | Not required — signature is auth |

## Adapter responsibilities

Each adapter implements:

1. **`verifyWebhook`** — parse headers, validate signature, check timestamp skew, compute `replayFingerprint`
2. **`normalizeWebhook`** — emit `NormalizedDeliveryEvent[]` with stable types

Vendor-specific logic stays in `providers/{vendor}-adapter.ts` only.

## Signed webhooks

| Check | Requirement |
|-------|-------------|
| Secret location | `KCCC_{VENDOR}_WEBHOOK_SECRET` in env only (Resend: `KCCC_RESEND_WEBHOOK_SECRET`) |
| Algorithm | Per vendor docs (e.g. HMAC-SHA256) — document in adapter |
| Constant-time compare | Use shared crypto helpers; no early string compare leaks |
| Unsigned payload | Reject — `signatureValid: false` |

## Clock skew

- Default tolerance: **`DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300`** (5 minutes)
- Reject events with timestamp outside window — log `rejectionCategory: TIMESTAMP_SKEW`
- Ensure Netlify/server clock is NTP-synced; large skew causes false rejects

## Replay fingerprints

Deterministic fingerprint from verified payload fields (adapter-defined, stable across retries):

```
replayFingerprint = hash(providerKey + providerEventId + eventType + occurredAt)
```

Stored in `CommunicationWebhookReceipt` with unique constraint.

| First delivery | Reprocessing |
|----------------|--------------|
| Process events, match attempts | Return duplicate success; no double suppression |

## Validation drill (sandbox)

### 1. Happy path

1. Send sandbox message via adapter dispatch
2. Trigger vendor webhook (or use vendor replay tool)
3. Confirm receipt `VERIFIED` → `PROCESSED`
4. Confirm delivery event on queue item with `source: PROVIDER`

### 2. Invalid signature

1. POST same payload with wrong secret signature
2. Expect 401, receipt `REJECTED`
3. No delivery event or suppression created

### 3. Stale timestamp

1. POST with timestamp > 300s old
2. Expect reject; no processing

### 4. Replay

1. POST identical valid webhook twice
2. First: processed; second: `DUPLICATE`, HTTP 200

### 5. Unmatched message

1. POST valid webhook for unknown `providerMessageId`
2. Receipt `UNMATCHED` — auditable, no fabrication

### 6. Suppression paths

| Event | Expected normalization |
|-------|------------------------|
| Hard bounce | `BOUNCED`, suppression `INVALID_DESTINATION` |
| Complaint | `COMPLAINT`, all-channel suppression per policy |
| Unsubscribe | `UNSUBSCRIBED`, channel opt-out |
| Soft bounce | No automatic suppression |

## Monitoring

Review webhook history for:

- Spike in `REJECTED` → secret mismatch or attack
- Spike in `UNMATCHED` → ID mapping bug in adapter
- Sustained `UNSUPPORTED` → normalize gap

## Test harness

- **`kccc-sandbox`** — local/CI webhook scenarios without vendor network
- **`kccc-test`** (D21) — unit tests only; not registered for production webhooks

## Related

- `KCCC_V2_1_COMMUNICATIONS_SANDBOX_CERTIFICATION_CHECKLIST.md`
- `KCCC_V2_1_COMMUNICATIONS_CREDENTIAL_ROTATION_GUIDE.md` (rotate webhook secret)
