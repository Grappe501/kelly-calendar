# KCCC V2.1 — Provider Integration Architecture (Mobilize)

**Status:** D17 live — gated Event publishing + bidirectional reconciliation; person/attendance writes still disabled  
**Date:** 2026-07-20  
**Docs revision inspected:** `1025d0f` (2024-03-27) from https://github.com/mobilizeamerica/api  
**Local system of record:** CampaignMission / Event / operational V2.1 models  
**Provider:** `ExternalProvider.MOBILIZE`  
**Mapping:** `ExternalObjectReference` (+ connection / sync run / candidate / checkpoint / publication)

## Boundaries

| Concern | Rule |
|---------|------|
| System of record | Local KCCC for Events/Missions. Mobilize for remote IDs/timestamps. |
| Adapter | Server-only (`src/features/mobilize-integration`). |
| Secrets | `MOBILIZE_API_KEY` in env only — never DB, client, logs, or errors. |
| Outbound writes | Create/update gated by `MOBILIZE_PUBLISHING_ENABLED` / `MOBILIZE_UPDATES_ENABLED`. Delete disabled. |
| Person/attendance | Forced disabled. |
| Sync failures | Must not block briefing/digest/launch/Mission ops. |

## Capability matrix (D17)

| Capability | Documented | Credential-tested | Application-enabled |
|------------|------------|-------------------|---------------------|
| Read org events | Yes | On verify | If `MOBILIZE_IMPORT_EVENTS_ENABLED` |
| Read deleted events | Yes | On verify | If import enabled |
| Read people / attendances | Yes | On verify (when permitted) | **No** (privacy defer) |
| Read enums | Yes | On verify | No |
| Create events | Yes | **Only after successful publish** | If publishing flag + credentials |
| Update events | Yes | **Only after successful update** | If updates flag + credentials |
| Delete events | Yes | **Never in D17 prod** | Flag exists; path still blocked |
| Create attendances / affiliations / images | Yes | **Never probed** | **No** |

## Transport

- Base: `https://api.mobilize.us/v1` (allowlist also includes staging host)
- Bearer auth; HTTPS only; `next` URL host validation
- Conservative read concurrency (~8/s vs documented 15/s)
- Bounded GET retries; `429` + `Retry-After`
- CREATE never blind-retried; unknown outcomes require reconcile

## Reconciliation

Prefer `ExternalObjectReference`. Never title-only auto-apply. Remote deletes mark references — do not delete local history. Dry-run may create `ExternalSyncRun` + candidates only. D17 adds three-way field comparison and timeslot identity reconciliation for publications.

## Publishing

See `KCCC_V2_1_MOBILIZE_EVENT_PUBLISHING_DELIVERABLE_17.md` and `KCCC_V2_1_MOBILIZE_PUBLISHING_OPERATOR_GUIDE.md`.


## Recommended D17

Mobilize Event Publishing and Bidirectional Reconciliation with explicit preview/approval.
