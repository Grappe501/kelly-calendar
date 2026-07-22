# CC-03 — Timezone, All-Day, Overnight & Multi-Day Hardening

**Status:** IMPLEMENTED  
**Build:** `KCCC-CC-03-TIMEZONE-ALLDAY-OVERNIGHT-HARDENING-1.0`  
**Doctrine:** `KCCC_CALENDAR_TIME_DOCTRINE.md`  
**Operator guide:** `KCCC_CALENDAR_TIME_OPERATOR_GUIDE.md`  
**Rollback:** `KCCC_CC_03_TIMEZONE_ALL_DAY_OVERNIGHT_HARDENING_ROLLBACK.md`

## Measurable improvement

Every Event has deterministic temporal semantics: timed vs all-day, IANA timezone, UTC instants, occupied campaign-local dates, overnight/multi-day membership, and DST gap/ambiguity handling — without fabricating times or duplicating Event rows for display.

## Schema

No migration. Existing fields are authoritative:

- `startsAt`, `endsAt` (UTC instants)
- `timezone` (IANA)
- `isAllDay`, `isMultiDay`

## Authoritative service

`src/lib/calendar/temporal/`

- Wall ↔ instant with DST gap rejection and ambiguity selection
- Timed / all-day normalization
- Occupied-day enumeration and day membership kinds
- Legacy classification helper (`classifyEventTemporal`) — classify only; no silent rewrite

## Surfaces updated

- Today / Day / Week / Month / Agenda membership (interval ∩ day)
- Agenda: campaign-local occupied days (removed UTC `slice(0,10)`)
- Event sheet: all-day toggle, end date, timezone, DST choice, conversion confirmations
- Mutations: strict `endsAt > startsAt`; derive `isMultiDay`
- Import mapper: exclusive Google all-day end; TZ provenance
- Brief / command summary day filters

## Explicitly not in CC-03

- Recurrence exceptions / EXDATE / edit-one (CC-04)
- Availability engine (CC-05)
- Conflict engine persistence (CC-06)
- Automatic production time corrections of ambiguous legacy rows

## Validation

```bash
npm run calendar:time:validate
npm run calendar:integrity:validate
npm run import:validate
npm run calendar:canonical:validate
```

## Count proof expectations

- Migration/build/validate do not change Event or Mission counts
- Automatic ambiguous corrections: **0**
- Display-generated duplicate Events: **0**
- Mission lifecycle mutations from CC-03: **0**

## CC-04 handoff

Recurrence and occurrence exceptions — series authority, RRULE, edit-one/future/series, EXDATE, DST-stable local-wall materialization. Do not begin during CC-03.
