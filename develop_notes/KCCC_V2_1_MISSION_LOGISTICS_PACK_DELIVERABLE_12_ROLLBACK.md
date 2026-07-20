# KCCC V2.1 — Mission Logistics Pack Rollback

## Preferred first step — disable surfaces

1. Remove or gate pages:
   - `src/app/system/missions/[missionId]/logistics/`
   - `src/app/system/briefing/logistics/`
   - `src/app/system/briefing/[date]/logistics/`
2. Remove or gate APIs under `src/app/api/missions/[missionId]/logistics/` and `src/app/api/briefing/[date]/logistics/`
3. Remove Day Logistics / Mission Logistics navigation links from Briefing, Launch, Closeout, Today’s Mission, Command Center, calendar day, Mission detail, Prepare, Day Movement, Mission travel

Do **not** delete CampaignMission, Prepare, Execute, Debrief, Follow-up, Closeout, Morning Launch Review, or Travel Movement code.

## Preserve data

Export before any drop:

```sql
SELECT * FROM kelly_calendar."MissionLogisticsPack";
SELECT * FROM kelly_calendar."MissionLogisticsItem";
SELECT * FROM kelly_calendar."MissionLogisticsHandoff";
SELECT * FROM kelly_calendar."MissionLogisticsAcknowledgement";
```

## Restore D11 behavior

- Briefing/Launch/Closeout continue without logistics board links
- Travel movement board unchanged
- Prepare `materialsNeeded` and Event packing items remain presentation-only signals

## Database rollback (last resort)

Only after export and route disable:

1. Drop `MissionLogisticsAcknowledgement`, `MissionLogisticsHandoff`, `MissionLogisticsItem`, `MissionLogisticsPack`
2. Drop related enums
3. Regenerate Prisma client
4. Prefer leaving migration history recorded

Do not make destructive rollback automatic. Do not alter Event scheduling or Mission lifecycle during rollback.
