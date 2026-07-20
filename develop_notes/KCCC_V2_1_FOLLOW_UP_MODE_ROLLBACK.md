# KCCC V2.1 Follow-up Mode — rollback

## Safe application rollback

1. Disable routes under `src/app/system/missions/[missionId]/follow-up`
2. Disable `src/app/api/missions/[missionId]/follow-up`
3. Point FOLLOW_UP CTA / Debrief “Open Follow-up” to mission detail if needed
4. Redeploy

**Preserved:** Event, CampaignMission, Preparation, Execution, Debrief, source provenance, completion evidence (until DB drop).

## Optional database rollback

```sql
DROP TABLE IF EXISTS "kelly_calendar"."MissionFollowUpAction";
DROP TABLE IF EXISTS "kelly_calendar"."MissionFollowUp";
DROP TYPE IF EXISTS "kelly_calendar"."MissionFollowUpOwnerType";
DROP TYPE IF EXISTS "kelly_calendar"."MissionFollowUpSourceType";
DROP TYPE IF EXISTS "kelly_calendar"."MissionFollowUpPriority";
DROP TYPE IF EXISTS "kelly_calendar"."MissionFollowUpActionStatus";
DROP TYPE IF EXISTS "kelly_calendar"."MissionFollowUpStatus";
```

## Must not

- Mutate Event scheduling
- Drop MissionDebrief / MissionExecution / MissionPreparation
- Auto-close or reopen Missions as part of rollback
