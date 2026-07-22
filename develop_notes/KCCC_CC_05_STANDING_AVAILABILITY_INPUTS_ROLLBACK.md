# CC-05 Rollback — Standing Availability Inputs

**Build:** `KCCC-CC-05-STANDING-AVAILABILITY-INPUTS-1.0`

## Blast radius

CC-05 is additive. It adds three new tables, one pure library, one server
service, eight API routes, five system pages, and non-blocking warning UI
inside the existing event editor / quick-create forms. It does not alter
the shape or semantics of `Event`, `CampaignMission`, or any CC-01…CC-04
table.

## Fast disable (no schema change)

1. Feature-flag off the save gate without touching the schema by having
   `assertAvailabilityAllowsSave` short-circuit: the safest single-line
   rollback is to comment out the three call sites
   (`event-lifecycle-service.ts` create/reschedule, `event-service.ts`
   update) — Events will save exactly as they did before CC-05.
2. Leave the API routes and UI in place (read-only from the operator's
   point of view) or gate `/system/calendar/availability/**` behind
   `requireSystemAdminPage` returning early (already the case).

## Full rollback

1. Revert the application code:
   - `src/lib/calendar/availability/**`
   - `src/server/services/availability-service.ts`
   - `src/app/api/calendar/availability/**`
   - `src/app/system/calendar/availability/**`
   - `src/components/calendar/availability/**`,
     `src/components/calendar/AvailabilityOverlay.tsx`,
     `src/components/events/AvailabilityWarningPanel.tsx`
   - Availability wiring in `src/server/services/event-service.ts`,
     `src/server/services/event-lifecycle-service.ts`,
     `src/app/api/events/route.ts`,
     `src/app/api/events/[eventId]/route.ts`,
     `src/app/api/events/[eventId]/reschedule/route.ts`,
     `src/components/events/EventEditorForm.tsx`,
     `src/components/event-entry/quick-event-form.tsx`
   - `AVAILABILITY_*` actions in `src/server/auth/actions.ts` and
     `src/server/auth/authorization.ts`
   - `metadata` support added to `AppError`/`ConflictError` in
     `src/lib/security/safe-error.ts` is safe to keep (additive, optional
     field) even if the rest of CC-05 is rolled back.
2. Drop the additive tables/enums (reverse of the migration):

   ```sql
   DROP TABLE IF EXISTS "kelly_calendar"."CalendarAvailabilityAcknowledgement";
   DROP TABLE IF EXISTS "kelly_calendar"."CalendarAvailabilityException";
   DROP TABLE IF EXISTS "kelly_calendar"."CalendarAvailabilityRule";
   DROP TYPE IF EXISTS "kelly_calendar"."CalendarAvailabilityAckDisposition";
   DROP TYPE IF EXISTS "kelly_calendar"."CalendarAvailabilityApprovalState";
   DROP TYPE IF EXISTS "kelly_calendar"."CalendarAvailabilityClassification";
   DROP TYPE IF EXISTS "kelly_calendar"."CalendarAvailabilityRuleType";
   DROP TYPE IF EXISTS "kelly_calendar"."CalendarAvailabilitySubjectType";
   ```

3. Remove the corresponding models/enums from `prisma/schema.prisma` and
   run `npm run db:generate`.
4. Remove `calendar:availability:validate` from `package.json` and delete
   `scripts/validate-calendar-availability.mjs`,
   `tests/unit/calendar-availability/**`.

## Data safety

- No existing `Event`/`CampaignMission` rows are touched by the migration
  or by any CC-05 code path.
- Acknowledgement rows reference `eventId` loosely (no FK) — dropping the
  table has zero referential impact on `Event`.
- No PII beyond `actorUserId` and free-text `reason`/`reasonSensitive`
  fields (operator-entered, already covered by the existing audit
  redaction policy via `writeAttributedAudit`).
