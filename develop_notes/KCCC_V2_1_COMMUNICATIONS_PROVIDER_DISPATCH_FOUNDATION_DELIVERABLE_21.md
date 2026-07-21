# KCCC V2.1 — Communications Provider Dispatch Foundation (Deliverable 21)

**Status:** Live on `main` (pending deploy-docs)  
**Feature commit:** pending  
**Deploy ID:** pending · https://kelly-calendar.netlify.app  
**Baseline:** D20 `main` @ `5b30760` · deploy-docs `4d6023a` · Netlify `6a5e8005f002f01635509176` · 252 tests  
**D1–D21 validation:** 261 tests passed (`npm run missions:v21:communications-dispatch:validate`; D21 adds 9)  
**Counts after migration/build:** Missions 37 · Events 38 · D18 observations/matches/correlations 0 · D19 staffing rows 0 · D20 policy / contact / evidence / suppressions / communications / audience / approvals / queue / delivery events **0** · **D21 provider connections / batches / attempts / webhook receipts / dispatch controls 0** · fabricated **0** · externally sent **0** · provider requests **0**  
**Production provider:** **NONE SELECTED** — `KCCC_COMMUNICATIONS_PROVIDER_KEY` unset  
**External dispatch:** **DISABLED** — kill switches default ON; policy `externalDispatchEnabled` remains false; no vendor adapter registered for production  

## Product purpose

Campaign-scoped **provider dispatch foundation** behind D20 consent-aware queue: provider registry, credential inspection hooks, kill switches, bounded operator batches, per-recipient attempts with idempotency, webhook receipt processing, unknown-outcome reconciliation, and provider-originated delivery events — **without** auto-send, consent inference, durable background queues, or production provider selection at ship.

D21 adds the plumbing to eventually send through an authorized email/SMS vendor. It does **not** turn on production dispatch. Operators still plan, approve, and queue in D20; D21 governs whether a bounded batch may reach a provider at all.

## Deliberate exclusions (v1)

- No production provider selected or registered (`disabled` adapter active when env unset)
- No auto-send on queue prepare, approval, or page load
- No durable background queue — operator-initiated bounded batches only (`DEFAULT_MAX_BATCH_SIZE = 25`)
- No consent inference from RSVP, attendance, staffing, check-in, or Mobilize signals
- No Mobilize as email/SMS provider (Mobilize remains event/signup/attendance)
- Test adapter `kccc-test` **cannot** be selected in production (`NODE_ENV=production` resolves to `disabled`)
- `applicationDispatchEnabled` remains false on all provider connections at ship
- Policy `externalDispatchEnabled` remains false unless explicitly changed in a future pass
- No fabrication of provider message IDs or delivery events without provider/webhook facts
- Page loads, build, validation, and navigation do **not** lazy-create dispatch batches or provider connections

## Allowed in D21

| Capability | Rule |
|------------|------|
| Provider registry | Lists registered keys; production registry excludes test adapter |
| Provider dashboard | Leadership view of active adapter, connections, kill switches — **no secrets exposed** |
| Connection verify | Credential-tested inspect/verify writes `CommunicationProviderConnection` with `applicationDispatchEnabled: false` |
| Kill switches | Global, email, and SMS switches default **ON (blocking)** |
| Dispatch preflight | Deterministic eligibility from recomputed facts + D20 approvals |
| Bounded batch create | Operator attempt creates audit batch — default status `BLOCKED` when dispatch unavailable |
| Test adapter (non-prod) | `kccc-test` for unit/integration tests only via explicit test entry points |
| Webhook ingress | Signed webhook verify + replay dedupe + normalized delivery events when provider registered |
| Suppression import | Webhook path may create suppressions from verified provider events (complaint, opt-out, hard bounce) |
| Unknown reconciliation | Operator-triggered reconcile for `UNKNOWN_OUTCOME` attempts |
| Delivery events | Provider-sourced events linked to queue items — **acceptance ≠ delivery** |

## Not allowed in D21 (ship state)

| Action | Rule |
|--------|------|
| Production dispatch | Blocked: no provider key, kill switches ON, policy gate false |
| Test adapter in production | Registry returns `disabled`; batch execution throws |
| Unbounded send | Max 25 items per batch; no cron/worker drain |
| Bypass preflight | All blocking reason codes must pass before provider request |
| Infer consent | Preflight requires effective consent facts from D20 engine |
| Skip suppression | `SUPPRESSION_ACTIVE` blocks dispatch |
| Mobilize messaging | No outbound send through Mobilize API |
| Lazy seed connections | Provider rows only on intentional verify/admin writes |

## Semantics

| Concept | Rule |
|---------|------|
| Provider acceptance | Provider accepted request — **not delivery**, **not engagement** |
| Delivery event | Recorded only from provider webhook or future manual import |
| Kill switch ON | Blocks dispatch for scope; re-enabling does **not** resume old batches |
| Batch `BLOCKED` | Audit record when operator attempts dispatch while gates closed |
| Batch `RUNNING` | Test path only outside production |
| Attempt `UNKNOWN_OUTCOME` | Timeout-after-possible-send — blocks retries until reconciled |
| Idempotency key | `dispatch:{providerKey}:{queueItemId}:{contentFingerprint}:{audienceFingerprint}` |
| Webhook receipt | Replay fingerprint dedupe; unsigned webhooks rejected |
| `ensureDefaultDispatchControl` | Creates default kill-switch row **only** on intentional leadership admin load (dashboard, controls read/update, preflight) — **not** on generic page loads or validation |

## Default controls (blocking)

| Setting | Default |
|---------|---------|
| `globalKillSwitch` | `true` |
| `emailKillSwitch` | `true` |
| `smsKillSwitch` | `true` |
| `reason` | `D21 default — production dispatch disabled` |
| Active provider (env unset) | `disabled` |
| `applicationDispatchEnabled` (connections) | `false` |
| `externalDispatchEnabled` (D20 policy) | `false` (unchanged) |

## Preflight blocking codes

Evaluated in `evaluateDispatchPreflight` — all must pass for dispatch:

`COMMUNICATION_INACTIVE` · `COMMUNICATION_CANCELLED` · `QUEUE_NOT_PREPARED` · `ALREADY_DISPATCHED` · `CONTENT_APPROVAL_INVALID` · `AUDIENCE_APPROVAL_INVALID` · `DISPATCH_APPROVAL_INVALID` · `POLICY_EXTERNAL_DISPATCH_DISABLED` · `PROVIDER_MODE_DISABLED` · `PROVIDER_DISPATCH_DISABLED` · `GLOBAL_KILL_SWITCH` · `EMAIL_KILL_SWITCH` · `SMS_KILL_SWITCH` · `CONTACT_INACTIVE` · `CONTACT_UNVERIFIED` · `CONSENT_INEFFECTIVE` · `SUPPRESSION_ACTIVE` · `DESTINATION_CHANGED` · `UNKNOWN_OUTCOME_OPEN` · `RATE_LIMIT_EXCEEDED` · `MISSING_DESTINATION_REF` · `MISSING_CONTENT_FINGERPRINT` · `MISSING_AUDIENCE_FINGERPRINT` · `MOBILIZE_LINK_INVALID`

## Models / migration

`20260720210000_v21_communications_provider_dispatch`

| Model | Role |
|-------|------|
| `CommunicationProviderConnection` | Per-vendor config snapshot, capability snapshot, verify timestamps — **no secrets stored** |
| `CommunicationDispatchControl` | Versioned kill switches per campaign scope |
| `CommunicationDispatchBatch` | Bounded operator batch with fingerprint snapshots |
| `CommunicationDispatchAttempt` | Per queue item provider request with idempotency |
| `CommunicationWebhookReceipt` | Verified webhook audit + replay dedupe |

### Enums

| Enum | Values |
|------|--------|
| `CommProviderMode` | `DISABLED`, `SANDBOX`, `PRODUCTION` |
| `CommProviderConfigState` | `NOT_CONFIGURED`, `PARTIAL`, `CONFIGURED`, `VERIFIED`, `DEGRADED`, `DISABLED` |
| `CommDispatchBatchStatus` | `DRAFT`, `PREFLIGHT_FAILED`, `READY`, `RUNNING`, `PAUSED`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `CANCELLED`, `BLOCKED` |
| `CommDispatchAttemptStatus` | `REQUESTED`, `PROVIDER_ACCEPTED`, `PROVIDER_REJECTED`, `UNKNOWN_OUTCOME`, `BLOCKED`, `CANCELLED` |
| `CommWebhookProcessingStatus` | `RECEIVED`, `VERIFIED`, `REJECTED`, `PROCESSED`, `DUPLICATE`, `UNMATCHED`, `UNSUPPORTED` |

### Invariants

- Provider connection unique per `(campaignScopeKey, providerKey)`
- Dispatch control unique per `campaignScopeKey`
- Attempt idempotency key unique globally
- Webhook replay fingerprint unique globally
- Batch references D20 `CampaignCommunication` and queue items — cascade on communication delete
- `assertDispatchFoundationIsolation()` — D21 does not mutate Mission phases, staffing, Mobilize writes, or consent

## D20 read boundaries

D21 **reads** D20 communications, queue items, approvals, policy, contact points, consent, and suppressions for preflight. D21 does **not**:

- Change D20 export/handoff semantics
- Auto-enable `externalDispatchEnabled`
- Create audience members or consent evidence
- Mutate staffing, D18 observations, or Mobilize publish state

See `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md` and `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`.

## Provider adapters

| Key | Role |
|-----|------|
| `disabled` | Default when no env key; all dispatch returns blocked |
| `kccc-test` | Deterministic test adapter — **test/non-production only** |

D20 `DisabledCommunicationProviderAdapter` (`disabled-d20`) remains for D20 export/handoff path. D21 dispatch registry is separate (`DisabledDispatchProviderAdapter`).

No vendor adapters (SendGrid, Twilio, etc.) registered until D22 selection.

## Architecture

| Layer | Path |
|-------|------|
| Domain | `src/lib/missions/v21/communications/dispatch/*` |
| D20 integration | `src/lib/missions/v21/communications/*` |
| Repository | `src/server/repositories/communications-dispatch-repository.ts` |
| Service | `src/server/services/communications-dispatch-service.ts` |
| Validation | `tests/unit/missions/v21-communications-dispatch.test.ts` |
| Migration apply | `scripts/apply-communications-dispatch-migration.mjs` |

Service entry points (leadership auth): provider dashboard, connection verify, dispatch controls, preflight, bounded batch create (blocked by default), dispatch history, webhook processing, unknown reconcile.

Env: `KCCC_COMMUNICATIONS_PROVIDER_KEY` — unset at ship.

## Validation

```bash
npm run missions:v21:communications-dispatch:validate
```

Includes full D1–D20 mission unit suite plus D21 dispatch tests.

## Migration report (expected)

Applied via `KCCC_ALLOW_SCHEMA_MIGRATION=1` + `scripts/apply-communications-dispatch-migration.mjs` (or `npm run stack:migrate` when history is clean).

| Metric | Count |
|--------|------:|
| Existing CampaignMission | 37 |
| Existing Event | 38 |
| D18 observations / matches / correlations | 0 / 0 / 0 |
| D19 staffing rows | 0 |
| D20 comms rows (all tables) | **0** |
| D21 provider connections | **0** |
| D21 dispatch batches | **0** |
| D21 dispatch attempts | **0** |
| D21 webhook receipts | **0** |
| D21 dispatch control | **0** (until intentional admin load creates default kill-switch row) |
| Fabricated dispatch records | **0** |
| Externally sent messages | **0** |

## Isolation boundary

`assertDispatchFoundationIsolation()` confirms D21 does not mutate Event, Mission phases, Field Ops, Logistics, staffing, Mobilize writes, or auto-send. Production dispatch disabled by default. No durable background queue.

## Operator guides

- `KCCC_V2_1_COMMUNICATIONS_DISPATCH_OPERATOR_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_PROVIDER_SELECTION_GUIDE.md`
- `KCCC_V2_1_COMMUNICATIONS_WEBHOOK_SECURITY.md`
- `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md` (D20 queue workflow)

## Production-readiness checklist

All items **unchecked** at D21 ship:

- [ ] Production provider selected and credential-verified
- [ ] `applicationDispatchEnabled` explicitly enabled on connection
- [ ] Policy `externalDispatchEnabled` enabled with leadership approval
- [ ] Kill switches explicitly turned OFF with documented reason
- [ ] Webhook endpoint registered with provider; signing secret in env (not in repo)
- [ ] Sandbox send drill completed with test recipients
- [ ] Legal/compliance review for channel and purpose
- [ ] Operator runbook reviewed (`DISPATCH_OPERATOR_GUIDE`, `WEBHOOK_SECURITY`)
- [ ] Rollback plan acknowledged (`DELIVERABLE_21_ROLLBACK`)

## Rollback

See `KCCC_V2_1_COMMUNICATIONS_PROVIDER_DISPATCH_FOUNDATION_DELIVERABLE_21_ROLLBACK.md`.

## Recommended D22

**Communications Provider Selection and Sandbox Adapter** — register first real vendor adapter, sandbox credential flow, explicit production promotion gate, and operator selection UX — still without inferring consent or unbounded auto-send.
