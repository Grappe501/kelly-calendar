# KCCC V2.1 — Provider Integration Architecture (Mobilize)

**Status:** D16 foundation live — server-only adapter + dry-run; **outbound writes disabled**  
**Date:** 2026-07-20  
**Docs revision inspected:** `1025d0f` (2024-03-27) from https://github.com/mobilizeamerica/api  
**Local system of record:** CampaignMission / Event / operational V2.1 models  
**Provider:** `ExternalProvider.MOBILIZE`  
**Mapping:** `ExternalObjectReference` (+ connection / sync run / candidate / checkpoint)

## Boundaries

| Concern | Rule |
|---------|------|
| System of record | Local KCCC. Mobilize never authorizes Mission lifecycle. |
| Adapter | Server-only (`src/features/mobilize-integration`). |
| Secrets | `MOBILIZE_API_KEY` in env only — never DB, client, logs, or errors. |
| Outbound writes | Forced disabled in D16. |
| Sync failures | Must not block briefing/digest/launch/Mission ops. |

## Capability matrix (D16)

| Capability | Documented | Credential-tested | Application-enabled |
|------------|------------|-------------------|---------------------|
| Read org events | Yes | On verify | If `MOBILIZE_IMPORT_EVENTS_ENABLED` |
| Read deleted events | Yes | On verify | If import enabled |
| Read people / attendances | Yes | On verify (when permitted) | **No** (privacy defer) |
| Read enums | Yes | On verify | No |
| Create/update/delete events | Yes | **Never probed** | **No** |
| Create attendances / affiliations / images | Yes | **Never probed** | **No** |

## Transport

- Base: `https://api.mobilize.us/v1` (allowlist also includes staging host)
- Bearer auth; HTTPS only; `next` URL host validation
- Conservative read concurrency (~8/s vs documented 15/s)
- Bounded GET retries; `429` + `Retry-After`; no write retries

## Reconciliation

Prefer `ExternalObjectReference`. Never title-only auto-apply. Remote deletes mark references — do not delete local history. Dry-run may create `ExternalSyncRun` + candidates only.

## Recommended D17

Mobilize Event Publishing and Bidirectional Reconciliation with explicit preview/approval.
