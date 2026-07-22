# CC-06 — Conflict Engine: Calendar Slice

**Status:** IMPLEMENTED (calendar slice)
**Build:** `KCCC-CC-06-CONFLICT-ENGINE-1.0`
**Authorization:** ADR-092 — `KCCC_CC_06_AUTHORIZATION_KELLY_2026-07-22.md` (Kelly authorization)
**Doctrine:** `KCCC_CALENDAR_CONFLICT_DOCTRINE.md`
**Operator guide:** `KCCC_CALENDAR_CONFLICT_OPERATOR_GUIDE.md`
**Rollback:** `KCCC_CC_06_CONFLICT_ENGINE_ROLLBACK.md`
**Architecture:** `KCCC_EA_13_CONFLICT_ENGINE_ARCHITECTURE.md` (EA-13 — full design; this build implements the calendar-slice minimum)

## What this build is

The **calendar slice** of the EA-13 Conflict Engine: a detect → explain →
persist → disposition pipeline for four conflict types, consuming CC-03
half-open intervals, CC-04 occurrence identities, and CC-05
`evaluateAvailability` output. It never automatically changes an Event,
Mission, availability rule, or travel fact — it only detects, explains,
and records an operator's disposition.

### Conflict types implemented

| Type | Source | Evidence |
|---|---|---|
| `TIME_OVERLAP` | Two active Events overlap (CC-03 half-open semantics) | Event start/end intervals |
| `AVAILABILITY_VIOLATION` | CC-05 `UNAVAILABLE` finding overlaps an Event | `AvailabilityAssessment` finding |
| `BUFFER_CONFLICT` | CC-05 `CONSTRAINED`/`REQUIRES_REVIEW` finding from an explicit `TRAVEL_BUFFER`/`PREPARATION_BUFFER`/`RECOVERY_BUFFER` rule | `AvailabilityAssessment` finding + rule type |
| `TRAVEL_INFEASIBLE` | Stored `EventTravelPlan` minutes only — never invented | `estimatedDurationMinutes`/`bufferMinutes` |

The remaining EA-13 types (`PARTICIPANT_DOUBLE_BOOK`, `VENUE_CONFLICT`,
`PRIORITY_COLLISION`, prep-buffer beyond the minimum, `FOLLOWUP_COLLISION`,
`RESOURCE_CONFLICT`) remain design-only — out of scope for this build.

## What this build is **not**

Per ADR-092 (binding restrictions), CC-06 never automatically: moves,
cancels, confirms, archives, restores, or deletes an Event; changes Event
status; changes recurrence or availability rules; creates or modifies
Missions; writes to Travel/Logistics/Field Ops/Staffing/Closeout/Launch;
invents travel duration/distance/traffic/routing; treats `ACKNOWLEDGED` as
resolved; resolves a conflict because the Event ended; writes to
Google/iCal/Mobilize. `automaticallyResolved` is always `false`.

It does **not** complete the Operator Usability Synthesis
(`KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md` remains `EMPTY`), and it does
**not** implement CC-07 (unified search/filters/saved views remain
design-only beyond the minimal filtering this queue needed).

## Model

- **Tables (extended, additive-only):** `OperationalConflictRecord`
  (`campaignKey`, `factFingerprint`, `disposition`, `dispositionReason`,
  `lastEvaluatedAt`, `stale`), `OperationalConflictAction` (`disposition`).
- **Migration:** `20260722120000_cc06_conflict_engine`
  (follows `20260722110000_cc05_standing_availability`).
- **Pure detectors:** `src/features/operational-intelligence/services/conflict-service.ts`
  (`detectTimeOverlapConflicts`, `detectAvailabilityViolationConflicts`,
  `detectBufferConflicts`, `detectTravelInfeasibleConflicts`,
  `computeConflictKey`, `computeConflictFactFingerprint`) — no DB, no
  `server-only` import, reusable by both the persistence engine and
  ephemeral view scans.
- **Engine service:** `src/server/services/conflict-engine-service.ts` —
  loads the Event graph for a window, runs the detectors, persists
  `OperationalConflictRecord` rows, marks stale records, and exposes
  read-only helpers (`listConflicts`, `getConflictsForEvent`,
  `loadConflictsForViewEvents`, `recheckConflictStillDetected`). Never
  touches `Event`/`CampaignMission` tables.
- **Disposition service:** `src/server/services/authenticated-ops-service.ts`
  (`acknowledgeConflict`, `overrideConflict`, `resolveConflict`,
  `markConflictNotApplicable`) — the only writers of disposition state,
  all audited via `writeAttributedAudit`.

## Stable `conflictKey`

`computeConflictKey({ conflictType, entityIds, overlapStartsAt, overlapEndsAt })`
hashes the conflict type, the **sorted, deduplicated** entity ids, and the
ISO overlap window. Two detections of the same underlying fact — regardless
of which entity is passed first — always produce the same key, so
recompute updates the existing row instead of creating a duplicate.

## Fact fingerprint and staleness

`computeConflictFactFingerprint({ severity, explanation, evidence })`
hashes the non-identity facts. Recompute compares this against the stored
`factFingerprint`:

- **Unchanged key, unchanged fingerprint:** `lastEvaluatedAt` refreshed only.
- **Unchanged key, changed fingerprint:** facts updated in place, audited
  as `CONFLICT_RECOMPUTED_CHANGED`.
- **Key no longer detected in a scanned window:** the record is marked
  `stale: true` (never deleted), audited as `CONFLICT_MARKED_STALE`.
  Operator disposition is still required to close it out.
- **A previously `RESOLVED`/`NOT_APPLICABLE` key is detected again:** the
  record reopens to `status: OPEN` with its disposition cleared, audited
  as `CONFLICT_REOPENED` — the underlying facts recurred; this is never a
  silent override of the prior disposition.

## Dispositions

| Disposition | Who/how | Effect on `status` | Reason |
|---|---|---|---|
| `ACKNOWLEDGED` | `POST /api/conflicts/[id]/acknowledge` | **unchanged** — never clears a blocker | optional |
| `ACCEPTED_RISK` | `POST /api/conflicts/[id]/override` (leadership only) | → `ACCEPTED_RISK` | **required** |
| `RESOLVED` | `POST /api/conflicts/[id]/resolve` | → `RESOLVED` | optional only if a fresh recompute confirms the conflict is no longer detected; **required** otherwise |
| `NOT_APPLICABLE` | `POST /api/conflicts/[id]/not-applicable` | → `NOT_APPLICABLE` | **required** |

Every disposition call creates an `OperationalConflictAction` row and an
attributed audit entry.

## APIs

- `GET /api/conflicts` — list, filterable by `status`, `severity`,
  `conflictType`, `includeStale`, `take`/`skip`.
- `POST /api/conflicts` — recompute a date range (`from`/`to`, defaults to
  today) or a single `eventId`.
- `POST /api/conflicts/[conflictId]/acknowledge`
- `POST /api/conflicts/[conflictId]/override` (`reason` required)
- `POST /api/conflicts/[conflictId]/resolve` (`reason` conditionally required)
- `POST /api/conflicts/[conflictId]/not-applicable` (`reason` required)
- `GET /api/events/[eventId]/conflicts` — persisted history + a read-only
  live re-assessment (never persisted by the GET itself).
- `POST /api/calendar/conflicts/recompute` — alias of the `/api/conflicts`
  POST, named to match the CC-05 `/api/calendar/availability/*` surface.

## Save-hook wiring (never blocks on TIME_OVERLAP)

`recomputeConflictsForEventBestEffort` is called **after** save from:

- `event-lifecycle-service.ts` → `createEventWithOptionalRecurrence`
  (base occurrence for recurring series) and `rescheduleEvent`.
- `event-service.ts` → `updateEvent`.

It never throws — a recompute failure is logged and does not roll back or
block the save. Availability blocking (CC-05, 409 + acknowledgement)
remains the only save-time block; CC-06 conflicts are always detected
after the fact and surfaced as a warning/queue item, never a save blocker.

## UI

- `/system/conflicts` — protected operator queue (`requireSystemAdminPage`).
  Filter by status/severity/type, recompute today, and act on each
  conflict (acknowledge / accept risk / resolve / not applicable).
- Event sheet (`/events/[eventId]`) — `EventConflictsPanel` shows the
  Event's open persisted conflicts (same disposition controls) plus a
  read-only live re-assessment.
- Day/Week/Month/Today operating views — `conflicts` prop now merges an
  in-memory `TIME_OVERLAP` scan of the events on screen (so the indicator
  never lags a just-made edit) with persisted, still-open conflicts of any
  CC-06 type for the same Events (`loadConflictsForViewEvents`).

## Validation

```bash
npm run calendar:conflicts:validate
npm run typecheck
npm run test -- tests/unit/calendar-conflicts
```

## Expected count proofs

- Events/Missions mutated by CC-06 detector or engine code: **0**
- Conflicts with `automaticallyResolved: true`: **0**
- `RESOLVED` conflicts granted without either a clean recompute or an
  explicit reason: **0**
- `TRAVEL_INFEASIBLE` conflicts raised without a stored
  `estimatedDurationMinutes`: **0**

## Known limitations (honest, not hidden)

- `TIME_OVERLAP` in the live view scan only compares Events already loaded
  for that view's window — it does not re-scan the whole calendar. The
  persisted recompute (`recomputeConflictsForRange`/`recomputeConflictsForEvent`)
  is the source of truth; the view scan is a fast, best-effort echo of it.
- `BUFFER_CONFLICT` only fires for the three named buffer rule types
  (`TRAVEL_BUFFER`, `PREPARATION_BUFFER`, `RECOVERY_BUFFER`); other
  `CONSTRAINED` findings (e.g. `PROTECTED_WORK`) are out of CC-06 minimum
  scope, matching ADR-092.
- Single-campaign `campaignKey` (`"kelly"`) throughout, matching CC-05.
