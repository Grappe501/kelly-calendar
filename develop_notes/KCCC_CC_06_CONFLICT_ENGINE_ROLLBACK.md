# CC-06 Rollback — Conflict Engine: Calendar Slice

**Build:** `KCCC-CC-06-CONFLICT-ENGINE-1.0`

## Blast radius

CC-06 is additive. It extends two existing tables
(`OperationalConflictRecord`, `OperationalConflictAction`) with nullable /
defaulted columns only, adds one migration, extends the pure conflict
library and one server service, adds/extends API routes, one system page,
and a read-only conflicts panel on the event sheet plus an in-memory
`conflicts` prop merge on the four operating views. It does not alter the
shape or semantics of `Event`, `CampaignMission`, `EventTravelPlan`, or any
CC-01…CC-05 table.

## Fast disable (no schema change)

1. Remove the three save-hook call sites so Events save exactly as they
   did before CC-06 (conflict recompute becomes a no-op):
   - `src/server/services/event-lifecycle-service.ts` — the two
     `recomputeConflictsForEventBestEffort(...)` calls in
     `createEventWithOptionalRecurrence` and the one in `rescheduleEvent`.
   - `src/server/services/event-service.ts` — the
     `recomputeConflictsForEventBestEffort(...)` call in `updateEvent`.
2. Revert the four operating-view services'
   (`calendar-day-view-service.ts`, `calendar-week-view-service.ts`,
   `calendar-month-view-service.ts`, `today-operating-view-service.ts`)
   `conflicts` assembly back to `detectCandidateOverlaps(...)` (the prior
   ephemeral-only call) to stop surfacing persisted conflicts there.
3. Leave the API routes, `/system/conflicts`, and `EventConflictsPanel` in
   place (read-only from the operator's point of view otherwise) or gate
   them off entirely — `/system/conflicts` is already behind
   `requireSystemAdminPage`.

## Full rollback

1. Revert the application code:
   - `src/features/operational-intelligence/services/conflict-service.ts`
     — remove the CC-06 additions (`CC06_CONFLICT_TYPES`,
     `CC06_INACTIVE_EVENT_STATUSES`, `computeConflictKey`,
     `computeConflictFactFingerprint`, `detectTimeOverlapConflicts`,
     `detectAvailabilityViolationConflicts`, `detectBufferConflicts`,
     `detectTravelInfeasibleConflicts`) — keep the pre-existing
     `detectCandidateOverlaps`/`assessTravelFeasibility` exports intact.
   - `src/server/services/conflict-engine-service.ts` (delete file).
   - CC-06 additions to `src/server/services/authenticated-ops-service.ts`
     (`resolveConflict`, `markConflictNotApplicable`; revert
     `acknowledgeConflict`/`overrideConflict` to their pre-CC-06 bodies).
   - `src/app/api/conflicts/route.ts` (revert to prior placeholder or
     delete), `src/app/api/conflicts/[conflictId]/resolve/route.ts`,
     `src/app/api/conflicts/[conflictId]/not-applicable/route.ts`,
     `src/app/api/events/[eventId]/conflicts/route.ts`,
     `src/app/api/calendar/conflicts/recompute/route.ts`.
   - `src/app/system/conflicts/page.tsx` (revert to the prior synthetic
     demo page), `src/components/calendar/conflicts/ConflictQueuePanel.tsx`
     (delete), `src/components/events/EventConflictsPanel.tsx` (delete)
     and its wiring in `src/app/events/[eventId]/page.tsx`.
   - `CONFLICT_RECOMPUTE`/`CONFLICT_RESOLVE`/`CONFLICT_NOT_APPLICABLE`
     actions in `src/server/auth/actions.ts` and
     `src/server/auth/authorization.ts`.
   - The `conflicts` assembly changes and `loadConflictsForViewEvents`
     imports in the four operating-view services listed above.
2. Revert the additive schema fields (reverse of the migration):

   ```sql
   ALTER TABLE "kelly_calendar"."OperationalConflictAction"
     DROP COLUMN IF EXISTS "disposition";
   ALTER TABLE "kelly_calendar"."OperationalConflictRecord"
     DROP COLUMN IF EXISTS "stale",
     DROP COLUMN IF EXISTS "lastEvaluatedAt",
     DROP COLUMN IF EXISTS "dispositionReason",
     DROP COLUMN IF EXISTS "disposition",
     DROP COLUMN IF EXISTS "factFingerprint",
     DROP COLUMN IF EXISTS "campaignKey";
   DROP INDEX IF EXISTS "kelly_calendar"."OperationalConflictRecord_relatedEntityId_idx";
   DROP INDEX IF EXISTS "kelly_calendar"."OperationalConflictRecord_primaryEntityId_idx";
   DROP INDEX IF EXISTS "kelly_calendar"."OperationalConflictRecord_campaignKey_status_stale_idx";
   ```

3. Remove the corresponding fields from `prisma/schema.prisma` and run
   `npm run db:generate`.
4. Remove `calendar:conflicts:validate` from `package.json` and delete
   `scripts/validate-calendar-conflicts.mjs`,
   `tests/unit/calendar-conflicts/**`.

## Data safety

- No existing `Event`/`CampaignMission`/`EventTravelPlan` rows are touched
  by the migration or by any CC-06 code path.
- `OperationalConflictRecord`/`OperationalConflictAction` rows created by
  CC-06 (detected conflicts and their disposition history) are the only
  new data; dropping the additive columns loses the `campaignKey`,
  `factFingerprint`, `disposition`, `dispositionReason`, `lastEvaluatedAt`,
  and `stale` values on those rows but does not orphan any other table
  (both tables already existed pre-CC-06 with no populated rows).
- No PII beyond `actorUserId` and free-text `reason`/`dispositionReason`
  fields (operator-entered, already covered by the existing audit
  redaction policy via `writeAttributedAudit`).
