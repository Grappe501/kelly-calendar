# CC-05 — Standing Availability Inputs

**Status:** IMPLEMENTED
**Build:** `KCCC-CC-05-STANDING-AVAILABILITY-INPUTS-1.0`
**Authorization:** ADR-090 — `KCCC_CC_05_WAIVER_KELLY_2026-07-22.md` (Kelly waiver, scoped to CC-05 only)
**Doctrine:** `KCCC_CALENDAR_AVAILABILITY_DOCTRINE.md`
**Operator guide:** `KCCC_CALENDAR_AVAILABILITY_OPERATOR_GUIDE.md`
**Rollback:** `KCCC_CC_05_STANDING_AVAILABILITY_INPUTS_ROLLBACK.md`

## What this build is

A calendar-only **standing availability input** slice: operators declare
recurring rules (office hours, protected work, preferred windows, travel /
prep / recovery buffers, vacations, blackouts) and one-off exceptions. The
create/edit/reschedule paths evaluate the proposed interval against those
rules and, when a finding requires it, ask the operator to acknowledge
before saving. Evaluation is exposed as a preview/overlay for date ranges.

## What this build is **not**

Per ADR-090 (binding conditions), CC-05:

- Does **not** persist `OperationalConflictRecord` or any CC-06 artifact.
- Does **not** auto-move, cancel, confirm, or resolve Events.
- Does **not** mutate Missions or external calendars.
- Does **not** complete the Operator Usability Synthesis
  (`KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md` remains `EMPTY`).
- Does **not** authorize CC-06 (Conflict Engine remains `GATED`).

## Model

- **Tables:** `CalendarAvailabilityRule`, `CalendarAvailabilityException`,
  `CalendarAvailabilityAcknowledgement`
- **Migration:** `20260722110000_cc05_standing_availability`
- **Pure library:** `src/lib/calendar/availability/` (types, fingerprint,
  expand, evaluate, standing-seeds) — no DB, no server-only imports.
- **Service:** `src/server/services/availability-service.ts` — loads
  ACTIVE rules/exceptions, calls the pure evaluator, records
  acknowledgements, writes audit rows. Never touches `Event` or
  `CampaignMission`.

## Classification precedence (hardest wins)

`UNAVAILABLE` > `REQUIRES_REVIEW` > `CONSTRAINED` > `PREFERRED` > `AVAILABLE`
> `UNKNOWN`. No active rules/exceptions → `UNKNOWN` (silence is not treated
as available).

## Surfaces

- **API:**
  `GET/POST /api/calendar/availability/rules`,
  `GET/PATCH /api/calendar/availability/rules/[ruleId]` (`op`: `update` |
  `approve` | `deactivate`),
  `GET/POST /api/calendar/availability/exceptions`,
  `PATCH /api/calendar/availability/exceptions/[exceptionId]` (`op: cancel`),
  `POST /api/calendar/availability/evaluate`,
  `POST /api/calendar/availability/acknowledge`,
  `GET /api/calendar/availability/preview?from=&to=`,
  `POST /api/calendar/availability/seed` (admin).
- **UI:** `/system/calendar/availability` (list + seed),
  `/system/calendar/availability/rules/new`,
  `/system/calendar/availability/rules/[ruleId]` (approve/deactivate),
  `/system/calendar/availability/exceptions`,
  `/system/calendar/availability/preview`.
- **Editor integration:** `AvailabilityWarningPanel` inside
  `EventEditorForm` and `QuickEventForm` — shown on successful save when an
  assessment has findings, and forced (409 → retry) when acknowledgement is
  required and missing/stale.
- **Overlay:** `AvailabilityOverlay` — non-interactive, text-labelled
  classification list; wired into the availability preview page.

## Create/update/reschedule wiring

`assertAvailabilityAllowsSave` (in `availability-service.ts`) is the single
save gate:

1. Evaluate the proposed interval against ACTIVE rules + exceptions.
2. If no finding requires acknowledgement, allow the save and return the
   assessment for display.
3. If a finding requires acknowledgement:
   - If the caller sent `availabilityAcknowledgement` with a matching
     `evaluationFingerprint` and disposition `ACKNOWLEDGED` /
     `ACCEPTED_RISK`, record the acknowledgement (audited) and allow the
     save.
   - Otherwise throw a `409 CONFLICT` `AppError` whose serialized body
     carries `error.metadata.availabilityAssessment` for the client to
     render and act on.

Wired into:

- `POST /api/events` → `createEventWithOptionalRecurrence` (base occurrence
  only for recurring series — see Known limitations).
- `PATCH /api/events/[eventId]` → `updateEvent` (only re-evaluated when
  `startsAt`/`endsAt`/`status` change).
- `POST /api/events/[eventId]/reschedule` → `rescheduleEvent`.

## Known limitations (honest, not hidden)

- Recurring series creation evaluates the **first occurrence only** — CC-05
  does not walk every materialized occurrence against availability. A
  future build may extend this if operator evidence shows it matters.
- `previewExpansion` / the preview UI expand at most 120 days per call
  (`MAX_EXPANSION_DAYS` in `expand.ts`) and mark `truncated: true` beyond
  that.
- The day-view calendar overlay integration was intentionally kept to the
  dedicated preview page rather than the live Day/Week/Month views, to
  avoid destabilizing the shipped CC-03/CC-04 operating views under this
  waiver's scope.

## Validation

```bash
npm run calendar:availability:validate
npm run typecheck
npm run test -- tests/unit/calendar-availability
```

## Expected count proofs

- `OperationalConflictRecord` rows created by CC-05 code: **0**
- Events/Missions auto-moved or auto-cancelled by CC-05 code: **0**
- Usability Synthesis marked complete by this build: **no** (`EMPTY`, unchanged)

## Ship evidence (2026-07-22)

| | |
|--|--|
| **Authorization** | ADR-090 · `KCCC_CC_05_WAIVER_KELLY_2026-07-22.md` · CC-05 only · Synthesis remains EMPTY · CC-06 still GATED |
| **Git** | `main` · feature `06cd7aa` · status `d755da4` · pushed |
| **Netlify** | https://kelly-calendar.netlify.app · deploy `6a60efa8f25804bc9b16f3f3` |
| **Live check** | `/system/calendar/availability` → 307 login; `/api/calendar/availability/rules` → 401; `/api/calendar/availability/evaluate` POST → 401 |
| **Validator** | `npm run calendar:availability:validate` — 44 passed |
| **Schema** | Additive SQL applied (`CalendarAvailabilityRule` / Exception / Acknowledgement); `migrate deploy` still blocked by prior failed `20260719160000_google_oauth_and_routes` — resolve separately |

## CC-06 handoff

**CC-06: Conflict Engine — Calendar Slice** will consume CC-03 normalized intervals, CC-04 recurrence identities, and CC-05 availability assessments to persist explainable scheduling conflicts and operator dispositions.

**Do not begin CC-06.** Per ADR-091, the next pass is **Operator Usability Pass 1 + Usability Synthesis 1** on the live CC-01–CC-05 calendar. ADR-090 does **not** authorize CC-06. Do not mark Synthesis complete because CC-05 shipped.
