# KCCC Step 5 — Database Readiness Report

**Generated:** 2026-07-18T15:10:00Z (local validation pass)

## Database target classification

| Field | Value |
|-------|-------|
| Target class | Hosted PostgreSQL (Supabase pooler) |
| Hosted or local | Hosted |
| Schema name | `kelly_calendar` |
| DATABASE_URL | Present (credentials redacted) |
| DIRECT_URL | Present or derived (credentials redacted) |
| Migration role | Deploy succeeded for Kelly Calendar migration |
| Credentials | Redacted in all reports |

## Schema ownership

- Owned schema: `kelly_calendar`
- Kelly tables in `public`: **0**
- Kelly tables in `kelly_calendar`: **60**

## Migration list

1. `20260718160000_kelly_calendar_foundation` — **applied**

## Tables created

60 models including CalendarGroup, Calendar, CalendarMembership, CalendarTeamBinding, CalendarRollupRule, CalendarSavedView, Event, EventCalendarMembership, EventVisibilityOverride, EventSectionPermission, operational plan tables, geography, import, templates, approvals, audit, AI suggestion tables. Full list from `npm run db:schema:verify`.

## Enums created

Calendar types, access levels, visibility, location disclosure, roll-up modes, event status, historical review, checklist/task/approval statuses, external provider/sync enums, objective/activity/channel types, and related Prisma enums in `prisma/schema.prisma`.

## Indexes and constraints

Indexes on event time/status/calendar/county/owner/historical fields; membership FKs; import identity uniqueness; audit entity/time. Check constraints for end-after-start, non-negative quantities/attendance, confidence 0–1, one active primary membership (partial unique).

## Seed data created

- 75 Arkansas counties  
- Approved regional model (editable)  
- Calendar groups + 17 system calendars including Command Calendar  
- Default roll-up rules → Command  
- System event / packing / program-flow / action templates  
- Default saved views  
- Event number counter  
- Seed is idempotent

## RedDirt integrity comparison

| Snapshot | Column signature |
|----------|------------------|
| Before | `d6943a2c72055cbbf81a4685ffe3c64e2db606f76dd66f7ab638070ecb4ac6b2` |
| After | `d6943a2c72055cbbf81a4685ffe3c64e2db606f76dd66f7ab638070ecb4ac6b2` |
| Difference | **0** |

Proofs: `develop_notes/database_proofs/reddirt-structure-before.json`, `reddirt-structure-after.json`

## Authentication prerequisite result

**BLOCKED / incomplete** — Step 4 not implemented. Mutations remain unauthorized.

## Permission test result

Unit projection tests cover NO_ACCESS / limited / protected personal. Live membership resolution awaits Step 4.

## Historical import result

Persistence tables ready. Staging import (Step 3) unchanged. Canonical approve/reject/merge **gated** until auth.

## Command Calendar query result

Query service present; returns auth-required until Step 4.

## Performance notes

No production-scale load test claimed. Indexes prepared for day/week/year query patterns. Formal fixture benchmarks deferred until authenticated query path is live.

## Known risks

Shared DB migration damage mitigated by namespace + snapshots. Remaining: wrong-target migration (preflight), permission leaks (projection + Step 4), import duplicates (external identity constraints).

## Rollback instructions

1. Do **not** reset the shared database.  
2. To reverse Kelly Calendar only: drop objects in `kelly_calendar` schema under operator change control (not automated in Step 5).  
3. RedDirt objects must remain untouched.  
4. See `KCCC_DATABASE_BACKUP_AND_RESTORE.md`.

## Production readiness

| Capability | Ready? |
|------------|--------|
| Schema foundation | Yes |
| Reference seed | Yes |
| Live event mutations | **No** (Step 4) |
| Candidate data | **No** |
| Google live sync | No |
| AI autonomous writes | No (forbidden) |
