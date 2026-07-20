# KCCC V2.1 Prepare Mode — rollback

## Safe application rollback (preferred)

1. Disable/remove routes:
   - `src/app/system/missions/[missionId]/prepare`
   - `src/app/api/missions/[missionId]/preparation`
2. Point “Open Mission Brief” back to mission detail if needed.
3. Redeploy.

**Preserved:** Event rows, CampaignMission rows, Today’s Mission selection.

## Optional database rollback

Only if preparation data must be removed:

```sql
DROP TABLE IF EXISTS "kelly_calendar"."MissionPreparation";
DROP TYPE IF EXISTS "kelly_calendar"."MissionPreparationReadiness";
```

## Must not

- Mutate Event scheduling columns
- Drop CampaignMission
- Change Today’s Mission selection rules as part of Prepare rollback
- Touch Google integration or legacy Mission Cards
