# CC-02 — Calendar Integrity & Provenance Console

```text
Build ID:     KCCC-CC-02-CALENDAR-INTEGRITY-PROVENANCE-CONSOLE-1.0
Detector:     CC-02-DETECTOR-1.0
Status:       COMPLETE
Baseline:     main after CC-01 (a77c9a9 / 095d30d)
Depends on:   CC-01 provenance contracts (src/lib/calendar/import-provenance.ts)
Feeds:        CC-11 health automation (future)
```

## Mission

Make the calendar trustworthy by exposing duplicates, provenance gaps, import anomalies, source/local drift, lifecycle inconsistencies, membership issues, and time/recurrence warnings — without automatically deleting or rewriting Events or Missions.

## Measurable improvements

- Integrity categories detectable: duplicate, provenance, import, drift, lifecycle/membership, time/recurrence warnings
- Provenance explanation on Event sheet + dedicated integrity routes
- Explicit bounded scans with persisted findings + dispositions
- Zero automatic Event/Mission mutations from scans, views, or dispositions
- CC-01 decisive proof remains green

## Routes

| Surface | Path |
|---------|------|
| Console | `/system/calendar/integrity` |
| Scans | `/system/calendar/integrity/scans` |
| Scan detail | `/system/calendar/integrity/scans/[scanId]` |
| Finding | `/system/calendar/integrity/findings/[findingId]` |
| Event integrity | `/system/calendar/integrity/events/[eventId]` |
| Summary/start scan API | `GET|POST /api/calendar/integrity` |
| Scans API | `GET /api/calendar/integrity/scans` |
| Finding API | `GET|POST /api/calendar/integrity/findings/[findingId]` |
| Provenance API | `GET /api/calendar/integrity/events/[eventId]/provenance` |
| Diagnostic export | `GET /api/calendar/integrity/export` (counts/types only; redacted) |

## Models / migration

- `CalendarIntegrityScan`
- `CalendarIntegrityFinding`
- `CalendarIntegrityDisposition`
- `CalendarIntegrityRepairAttempt` (preview-only in CC-02)
- Migration: `20260722010000_cc02_calendar_integrity`
- Apply note: on this host, full `migrate deploy` is blocked by divergent Prisma history (legacy `public._prisma_migrations` vs `kelly_calendar`). CC-02 SQL was applied with `prisma db execute` and recorded via `migrate resolve --applied` (mirrored into `kelly_calendar._prisma_migrations`). Event/Mission counts unchanged by apply.

## Detection

- Detector version: `CC-02-DETECTOR-1.0`
- Soft limit: 2500 Events; truncation reported
- Finding families: duplicates, provenance, import integrity, source/local drift, lifecycle/membership, Mission-boundary (report only), time/recurrence warnings
- Stable finding keys via `stableIntegrityFindingKey`
- Page loads never start scans; scans never mutate Events/Missions

## Repairs

**Enabled:** disposition recording; open Event / import links; repair preview stating no auto mutation; redacted diagnostic export.  
**Excluded:** auto merge, delete, cancel, archive, restore, timing rewrite, identity rewrite, Mission mutation.

## Validator

`npm run calendar:integrity:validate`

## Ship evidence

| Check | Result |
|-------|--------|
| Feature commit | `68f8354` |
| Harden / ADR-089 | `16b8fa0` |
| Tip at re-verify | `7e5bf8e` |
| Detector | `CC-02-DETECTOR-1.0` |
| `calendar:integrity:validate` | PASS |
| Detector unit tests | 8 PASS |
| CC-01 `import:apply:proof` | PASS (regression) |
| `calendar:canonical:validate` / `import:validate` | PASS |
| Live route | `/system/calendar/integrity` → 307 auth redirect (protected) |
| Netlify | https://kelly-calendar.netlify.app · deploy `6a60d411386bb843f703a575` |

## CC-03 handoff

CC-02 reports overnight/all-day/timezone/recurrence integrity risks. **CC-03 is COMPLETE** — campaign-local day membership, multi-day rendering, all-day editing, overnight spans, and DST behavior are owned by the temporal doctrine (`KCCC_CALENDAR_TIME_DOCTRINE.md`). CC-02 remains read-only for Event/Mission mutation.
