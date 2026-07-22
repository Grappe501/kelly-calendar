# CC-04 — Recurrence & Occurrence Exceptions

**Status:** IMPLEMENTED  
**Build:** `KCCC-CC-04-RECURRENCE-OCCURRENCE-EXCEPTIONS-1.0`  
**Doctrine:** `KCCC_CALENDAR_RECURRENCE_DOCTRINE.md`  
**Operator guide:** `KCCC_CALENDAR_RECURRENCE_OPERATOR_GUIDE.md`  
**Rollback:** `KCCC_CC_04_RECURRENCE_OCCURRENCE_EXCEPTIONS_ROLLBACK.md`

## Measurable improvement

Operators can create, inspect, edit (this / this-and-future / series), cancel, restore, import, and audit recurring series without duplicate Events, DST drift, unbounded materialization, silent series corruption, or automatic Mission mutation.

## Model

- **Authority:** Model B — series + materialized Events
- **Migration:** `20260722090000_cc04_recurrence_exceptions`
- **Tables:** `CalendarRecurrenceSeries`, `CalendarOccurrenceException`
- **Library:** `rrule`

## Surfaces

- API: `POST/GET /api/calendar/recurrence`, `GET /api/calendar/series/[seriesId]`, `POST /api/events/[eventId]/occurrence`
- UI: `/calendar/series/[seriesId]`, Event sheet series link + cancel-this-occurrence
- Create path: `createEventWithOptionalRecurrence` → `createRecurringSeries`
- Import: EXDATE parse + shared expand core

## Validation

```bash
npm run calendar:recurrence:validate
npm run calendar:time:validate
npm run calendar:integrity:validate
npm run import:validate
```

## Expected count proofs

- Duplicate Events from repeat expansion: **0**
- Automatically created Missions: **0**
- View-triggered recurrence writes: **0**

## Ship evidence (2026-07-22)

| | |
|--|--|
| **Git** | `main` · feature `564cea4` · pushed |
| **Netlify** | https://kelly-calendar.netlify.app · deploy `6a60dfdb9b33f85409a6185d` |
| **Live check** | Week/Agenda/Quick-add/Integrity → 307 login; `/api/calendar/recurrence` → 401 |
| **Validator** | `npm run calendar:recurrence:validate` — 36 passed |
| **Schema** | Additive SQL applied (`CalendarRecurrenceSeries` / exceptions); `migrate deploy` still blocked by prior failed `20260719160000_google_oauth_and_routes` — resolve separately |

## CC-05 handoff

Standing Availability Inputs were gated on Usability Synthesis or a Kelly/Steve waiver. **CC-05 is now authorized** (Kelly waiver ADR-090, 2026-07-22) and implemented — see `KCCC_CC_05_STANDING_AVAILABILITY_INPUTS.md`. Usability Synthesis itself remains `EMPTY`; the waiver covers CC-05 only, and CC-06 (Conflict Engine) remains separately gated.
