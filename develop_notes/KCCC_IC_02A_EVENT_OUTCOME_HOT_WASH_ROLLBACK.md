# IC-02A Rollback — Event Outcome and Hot Wash

```text
Build:     KCCC-IC-02A-EVENT-OUTCOME-HOT-WASH-1.0
Migration: 20260723150000_ic02a_event_outcome_hot_wash
```

## Safe rollback posture

Prefer **feature disable by route/nav** over destructive schema rollback in
production. Tables are additive and history-preserving.

## Application rollback

1. Revert or disable navigation to `/system/events/.../outcome` and
   `/system/calendar/reviews`.
2. Redeploy prior production commit (pre–IC-02A feature commit).
3. Leave tables in place (orphaned data is inert).

## Schema rollback (only if required and authorized)

**Destructive.** Requires explicit Kelly approval.

```sql
-- Order matters due to FKs
DROP TABLE IF EXISTS "kelly_calendar"."EventOutcomeAuditEntry";
DROP TABLE IF EXISTS "kelly_calendar"."EventOutcomeFollowUpLink";
DROP TABLE IF EXISTS "kelly_calendar"."EventEncounter";
DROP TABLE IF EXISTS "kelly_calendar"."EventHotWashEntry";
DROP TABLE IF EXISTS "kelly_calendar"."EventOutcomeReview";
-- Enums may remain if other objects reference them; drop only when unused.
```

Then `prisma migrate resolve` / mark migration rolled back per ops runbook.
Do **not** mutate Event or Mission rows as part of rollback.

## What rollback does not undo

- Operator-created `EventFollowup` rows linked from outcomes remain (intentional
  campaign tasks). Soft-delete or close those manually if needed.
- No automatic restoration of prior EventStatus (IC-02A never changed EventStatus
  from eligibility alone).
