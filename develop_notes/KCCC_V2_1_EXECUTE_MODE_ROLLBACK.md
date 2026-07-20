# KCCC V2.1 Execute Mode — rollback

## Safe application rollback

1. Disable routes:
   - `src/app/system/missions/[missionId]/execute`
   - `src/app/api/missions/[missionId]/execution`
2. Point Execute CTA back to mission detail if needed.
3. Redeploy.

**Preserved:** Event, CampaignMission, MissionPreparation, Today’s Mission selection.

## Optional database rollback

```sql
DROP TABLE IF EXISTS "kelly_calendar"."MissionExecution";
DROP TYPE IF EXISTS "kelly_calendar"."MissionExecutionStatus";
```

## Must not

- Mutate Event scheduling
- Drop CampaignMission or MissionPreparation
- Alter Today’s Mission selection as part of Execute rollback
