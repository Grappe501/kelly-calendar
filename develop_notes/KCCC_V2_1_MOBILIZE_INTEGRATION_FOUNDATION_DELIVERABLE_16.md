# KCCC V2.1 — Mobilize Integration Foundation (Deliverable 16)

**Status:** LIVE (foundation; live credential verification pending if key unset)  
**Date:** 2026-07-20  
**Branch:** `main`  
**Migration:** `20260720160000_v21_mobilize_integration_foundation`  
**Validate:** `npm run missions:v21:mobilize:validate`  
**Rollback:** `KCCC_V2_1_MOBILIZE_INTEGRATION_FOUNDATION_DELIVERABLE_16_ROLLBACK.md`  
**Operator guide:** `KCCC_V2_1_MOBILIZE_OPERATOR_GUIDE.md`

## Official documentation inspected

| Field | Value |
|-------|--------|
| Source | https://github.com/mobilizeamerica/api |
| Revision | `1025d0f8920f9484f4e68368c0f403c8b68a3e92` (`1025d0f`) |
| Commit date | 2024-03-27T19:45:55Z |
| Inspection date | 2026-07-20 |
| API base | `https://api.mobilize.us/v1` |
| Auth | HTTPS Bearer token (`Authorization: Bearer API_KEY`); invalid → **403** |
| Pagination | `cursor` (default) + `page` / `per_page` (default 25); `next` / `previous` links |
| `results_limited_to` | Present on some filtered searches |
| Rate limits (docs) | **15** GET/s · **5** POST/PUT/s · **429** when limited (may change — reverify) |
| Live discrepancy | None observed in this pass (no production key available during implementation; transport verified with mocks) |

### Endpoints used (read)

- `GET /v1/organizations/:id/events`
- `GET /v1/organizations/:id/events/:event_id`
- `GET /v1/organizations/:id/events/deleted`
- `GET /v1/organizations/:id/people`
- `GET /v1/organizations/:id/attendances`
- `GET /v1/organizations/:id/events/:event_id/attendances`
- `GET /v1/organizations/:id/promoted_organizations`
- `GET /v1/enums`

### Documented write endpoints — **application-disabled in D16**

Create/update/delete events, create attendances, affiliations, image upload.

## Product boundaries

- Mobilize owns remote object identity + remote timestamps.
- Kelly Calendar owns Missions and all operational layers (Prepare→Launch, Travel, Logistics, Field Ops, Incidents, Digest).
- Import never auto-creates/starts Missions.
- Attendance never marks Execute completion.
- Remote deletes are reconciliation facts — local history preserved.
- Sync failures never block local Mission ops.
- Outbound publishing forced off.

## Credentials

Env only (server / Netlify UI):

- `MOBILIZE_API_KEY`
- `MOBILIZE_ORGANIZATION_ID`
- Optional `MOBILIZE_API_BASE_URL` (allowlisted HTTPS hosts: `api.mobilize.us`, `staging-api.mobilize.us`)
- Optional `MOBILIZE_IMPORT_EVENTS_ENABLED`

Never stored in DB, never returned to clients, never logged.

## Models

- Extended `ExternalObjectReference` (campaign scope, fingerprints, remote deleted/created)
- `ExternalIntegrationConnection`
- `ExternalSyncRun` / `ExternalSyncCandidate` / `ExternalSyncCheckpoint`

## Routes

- `/system/integrations`
- `/system/integrations/mobilize`
- `/system/integrations/mobilize/runs`
- `/system/integrations/mobilize/runs/[runId]`
- APIs under `/api/integrations/mobilize/*`

## Apply semantics (D16)

Explicit apply registers `ExternalObjectReference` for eligible dry-run candidates (`NEW_REMOTE`, `REMOTE_CHANGED`, `REMOTE_DELETED`). Does **not** materialize local Events into Missions. Person/attendance apply disabled.

## Recommended Deliverable 17

**Mobilize Event Publishing and Bidirectional Reconciliation** — preview/approval, idempotent create/update, conflict handling, deletion safeguards, full audit. Keep person/attendance writes separate until consent model is complete.
