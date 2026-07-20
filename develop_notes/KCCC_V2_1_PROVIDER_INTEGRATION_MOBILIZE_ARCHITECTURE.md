# KCCC V2.1 — Provider Integration Architecture (Mobilize-ready)

**Status:** Foundation only (D15) — **no live Mobilize calls**  
**Date:** 2026-07-20  
**Local system of record:** CampaignMission / Event / MissionIncident and related KCCC models  
**Provider enum:** `ExternalProvider` includes `MOBILIZE`  
**Normalized mapping:** `ExternalObjectReference`

## Boundaries

| Concern | Rule |
|---------|------|
| System of record | Local KCCC database. Mobilize is never the authority. |
| Adapter boundary | Server-only adapter module (future). Browser never holds API keys. |
| Secrets | Stored only in encrypted server credential stores / env — never in models, logs, reports, or client bundles. |
| D15 operation | Digest and review work without a Mobilize key. Unavailable Mobilize must not block local ops. |
| Speculative I/O | Forbidden until endpoints are verified against **official Mobilize documentation**. |

## External identity mapping

`ExternalObjectReference` fields:

- `provider`, `objectType`, `externalObjectId`
- Soft `localObjectType` / `localObjectId` (no hard FK to every operational model)
- `remoteVersion`, `remoteUpdatedAt`
- `lastSuccessfulSyncAt`, `lastAttemptAt`
- `syncDirection`, `syncStatus`
- `provenance` (manual / poll / webhook / import / publish / reconcile)
- `idempotencyKey` (unique per provider when set)
- `conflictState`
- `lastErrorCode` / `lastErrorSummary` (no secrets)

Duplicate remote identities are constrained by `@@unique([provider, objectType, externalObjectId])`.

## Import / publish direction

Future adapter should support explicit directions via existing `SyncDirection`:

- Import-only (signups, attendance, shifts)
- Export-only / publish (events) — **opt-in**, never silent
- Two-way with conflict detection and manual reconciliation

## Idempotency & provenance

- Every import/publish batch should carry an idempotency key.
- Provenance must record whether data arrived via poll, webhook, import, publish, or reconcile.
- Replays must not create duplicate local records.

## Conflict resolution

- Detect conflicts; default to `MANUAL_REQUIRED` rather than auto-overwrite local SOR.
- Resolve explicitly as local-wins, remote-wins, or operator merge.
- Never invent remote IDs or sync success state.

## Retry / rate-limit

- Server-side retry with backoff; respect provider rate limits.
- Sync failures update error metadata only — they must not fail briefing/digest/launch reads.

## Audit

- Record who triggered publish/import, when, direction, and outcome codes.
- Audit payloads must exclude secrets and unnecessary PII.

## Privacy & consent

- Respect D14 sensitivity / redaction rules when surfacing remote-linked mission data.
- Do not sync confidential narrative to Mobilize without explicit product approval.

## Proposed Mobilize capability map (not enabled)

| Capability | Direction | Enabled |
|------------|-----------|---------|
| Event publish | OUT | No |
| Event reconcile | BOTH | No |
| Signup / RSVP ingest | IN | No |
| Shift / attendance ingest | IN | No |
| Cancel / schedule-change detect | IN | No |
| Webhook receive / poll sync | IN | No |

**Explicit statement:** Endpoint paths, auth schemes, payload shapes, and rate limits **must be verified against official Mobilize documentation** before any integration deliverable enables them. Do not hardcode behavior from memory.
