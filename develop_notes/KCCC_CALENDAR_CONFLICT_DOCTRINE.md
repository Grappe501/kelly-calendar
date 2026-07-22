# Calendar Conflict Doctrine (CC-06)

**Version:** `CC-06-1.0`
**Authorization:** ADR-092 (Kelly authorization, calendar-slice scope)

## Governing rule

> The conflict engine **detects, explains, and records disposition**. It
> never **decides, moves, resolves, or invents**.

This mirrors the existing `SCHEDULE_MUTATION_GOVERNING_RULE`:
`DETECT_EXPLAIN_RECOMMEND_SIMULATE_NEVER_AUTO_MUTATE`, and extends CC-05's
"input, evaluation, and warning" doctrine one layer up: CC-05 evaluates
*standing rules against one proposed interval*; CC-06 evaluates *pairs and
sets of Events* and persists what it finds as an explainable, disposable
record — but the record is never treated as ground truth by any other
system, and it never causes a write to `Event`, `CampaignMission`, or any
travel/logistics table.

## Conflict types and their evidence contract (calendar slice)

| Type | Fires when | Never fires when |
|---|---|---|
| `TIME_OVERLAP` | Two active Events truly overlap: `a.start < b.end && b.start < a.end` | Either Event is `CANCELLED`/`DECLINED`/`ARCHIVED` or explicitly non-attending; boundary-touching (half-open) |
| `AVAILABILITY_VIOLATION` | A CC-05 `evaluateAvailability` finding classifies `UNAVAILABLE` and overlaps the Event | The finding classifies `PREFERRED`/`CONSTRAINED`/`AVAILABLE`/`UNKNOWN` |
| `BUFFER_CONFLICT` | A CC-05 `CONSTRAINED`/`REQUIRES_REVIEW` finding traces to an explicit `TRAVEL_BUFFER`/`PREPARATION_BUFFER`/`RECOVERY_BUFFER` rule | The finding traces to any other rule type (e.g. `PROTECTED_WORK`) — out of calendar-slice scope |
| `TRAVEL_INFEASIBLE` | A stored `EventTravelPlan.estimatedDurationMinutes` implies infeasible/unlikely/tight travel to the next Event | No stored `estimatedDurationMinutes` exists — result is **UNKNOWN**, never flagged |

**Never invent facts.** CC-06 never estimates travel duration, distance,
traffic, or routing on its own — `TRAVEL_INFEASIBLE` reads only stored
`EventTravelPlan` fields. Absent facts are `UNKNOWN`, not a conflict.

## Overlap semantics (inherited from CC-03)

Intervals are **half-open** `[startsAt, endsAt)`. An Event that starts the
instant another ends does **not** overlap it — the same rule CC-05 applies
to availability windows applies here to Event-vs-Event and Event-vs-travel
comparisons.

## Stable identity

`conflictKey` is a deterministic hash of `{ conflictType, sorted+deduped
entityIds, overlapStartsAt, overlapEndsAt }`. Entity-id order never affects
the key — this is what lets recompute update an existing row rather than
create a duplicate every time it runs, and what lets a live (ephemeral)
`TIME_OVERLAP` detection merge cleanly with a persisted one in the
operating views.

`factFingerprint` hashes the non-identity facts (severity, explanation,
evidence) as of the last recompute. It exists purely to detect drift under
an unchanged `conflictKey` — it is never used as identity.

## Severity model

Reuses the existing `ConflictSeverity` (`INFO` | `WARNING` | `HIGH` |
`CRITICAL`). Calendar-slice mapping:

- `TIME_OVERLAP`: `CRITICAL` when both Events are `CONFIRMED`/`IN_PROGRESS`,
  otherwise `WARNING`.
- `AVAILABILITY_VIOLATION`: always `CRITICAL` (an `UNAVAILABLE` CC-05
  finding is itself a hard blocker classification).
- `BUFFER_CONFLICT`: always `WARNING` (a compressed buffer, not an
  impossibility).
- `TRAVEL_INFEASIBLE`: `CRITICAL` when `IMPOSSIBLE`, `HIGH` when
  `UNLIKELY`, `WARNING` when `TIGHT`; never fires at all when `FEASIBLE`
  or `UNKNOWN`.

## Recompute and staleness

Recompute is idempotent and additive-only from the operator's point of
view:

1. Detect current conflicts for the scanned window.
2. For each detected conflict: create if new; if it already exists and the
   fact fingerprint changed, update the facts in place (audited); if it was
   previously `RESOLVED`/`NOT_APPLICABLE`, reopen it to `OPEN` with
   disposition cleared (audited as `CONFLICT_REOPENED` — the facts
   recurred, this is not an override of the prior operator decision).
3. For any non-stale, non-closed record in the scanned window whose key was
   **not** re-detected, mark it `stale: true` (audited). Never delete.
   Stale records still require an explicit operator disposition to close.

**History is never deleted.** Every action (`ACKNOWLEDGED`, `OVERRIDDEN`,
`RESOLVED`, `NOT_APPLICABLE`, plus engine-side `CONFLICT_DETECTED` /
`CONFLICT_REOPENED` / `CONFLICT_RECOMPUTED_CHANGED` / `CONFLICT_MARKED_STALE`)
is an audited, additive row.

## Disposition semantics (binding, ADR-092)

- **`ACKNOWLEDGED` never clears a blocker.** It records that an operator
  saw the conflict; `status` is intentionally left untouched. A conflict
  can be `OPEN` with the latest disposition `ACKNOWLEDGED` indefinitely.
- **`ACCEPTED_RISK` always requires a reason** and is leadership-only
  (`CONFLICT_OVERRIDE` authorization, unchanged from the pre-CC-06 API).
  `status` moves to `ACCEPTED_RISK`, not silently closed — it stays
  visible in the queue until an explicit `RESOLVED`/`NOT_APPLICABLE`.
- **`RESOLVED` is only granted automatically (no reason required) when a
  fresh recompute confirms the conflict is no longer detected** from
  current stored facts. If recompute still detects it, an explicit reason
  is required — the operator is asserting something the engine cannot see
  (e.g. a manual mitigation), never "the Event ended" as a reason on its
  own, since ended Events are still checked exactly like active ones by
  the recompute path.
- **`NOT_APPLICABLE` always requires a reason** — the operator is
  overriding a detection they judge to be a false positive in their
  specific context.

## Hard boundaries (binding, ADR-092)

1. CC-06 code never writes `Event`, `CampaignMission`,
   `EventTravelPlan`/`EventTravelSegment`, `CalendarAvailabilityRule`/
   `CalendarAvailabilityException`, or any Google/iCal/Mobilize table.
2. `automaticallyResolved` is always `false` on every
   `OperationalConflictRecord` this build creates or updates.
3. Every detected conflict carries a human-readable `explanation` and a
   structured `evidence[]` array — never an opaque code alone.
4. Suggested resolutions are one-click **proposals** only
   (`autonomous: false` on every `SuggestedResolution`); none of them are
   wired to an auto-apply path in this build.
