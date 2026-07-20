# KCCC V2.1 Debrief Mode — rollback

## Safe application rollback

1. Disable routes:
   - `src/app/system/missions/[missionId]/debrief`
   - `src/app/system/missions/[missionId]/debrief/report`
   - `src/app/api/missions/[missionId]/debrief`
2. Point DEBRIEF CTA / Execute “Open Debrief” back to mission detail if needed.
3. Redeploy.

**Preserved:** Event, CampaignMission, MissionPreparation, MissionExecution, Today’s Mission selection, approved-for-follow-up selections in DB until table drop.

## Optional database rollback

```sql
DROP TABLE IF EXISTS "kelly_calendar"."MissionDebrief";
DROP TYPE IF EXISTS "kelly_calendar"."MissionOutcomeAssessment";
DROP TYPE IF EXISTS "kelly_calendar"."MissionDebriefStatus";
```

## Must not

- Mutate Event scheduling
- Drop CampaignMission, MissionPreparation, or MissionExecution
- Alter Today’s Mission selection as part of Debrief rollback
