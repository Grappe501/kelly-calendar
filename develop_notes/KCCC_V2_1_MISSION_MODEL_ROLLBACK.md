# KCCC V2.1 Mission model — rollback

**Safe rollback:** remove projection surfaces and drop the additive mission table.  
**Never required:** mutating or deleting `Event` rows.

## Application rollback (no DB drop)

1. Revert or disable routes:
   - `src/app/api/events/[eventId]/mission`
   - `src/app/api/missions/[missionId]`
   - `src/app/system/missions`
2. Leave `Event` and calendar UI as-is — scheduling never depended on `CampaignMission`.
3. Redeploy.

## Database rollback (optional)

Only after confirming no operator workflow depends on persisted missions:

```sql
-- kelly_calendar only
DROP TABLE IF EXISTS "kelly_calendar"."CampaignMission";
DROP TYPE IF EXISTS "kelly_calendar"."MissionOperationalStatus";
DROP TYPE IF EXISTS "kelly_calendar"."MissionLifecyclePhase";
```

Then remove the migration directory  
`prisma/migrations/20260720020000_v21_campaign_mission`  
from a follow-up commit **only if** that migration has not been applied in production,  
or record a compensating migration if it has.

## What rollback does NOT do

- Does not restore “lost” schedule data (none was changed).
- Does not require Google / Routes changes.
- Does not touch RedDirt schemas.
