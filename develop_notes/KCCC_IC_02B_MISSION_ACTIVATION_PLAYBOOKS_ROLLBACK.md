# IC-02B Rollback

Prefer disable routes/nav over destructive drops.

```sql
-- Authorized destructive rollback only
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationNotification";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationAuditEvent";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationAcknowledgement";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationVolunteerNeed";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationAssignment";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationTaskDependency";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationTask";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationWorkstream";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationPlan";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationTemplateStep";
DROP TABLE IF EXISTS "kelly_calendar"."MissionActivationTemplate";
```

Does not mutate Events/Missions. Does not undo D20 queue rows.
