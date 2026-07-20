# KCCC V2.1 — Travel and Movement Operations Rollback

## Preferred first step — disable surfaces

1. Remove or gate pages:
   - `src/app/system/missions/[missionId]/travel/`
   - `src/app/system/briefing/movement/`
   - `src/app/system/briefing/[date]/movement/`
2. Remove or gate APIs under `src/app/api/missions/[missionId]/travel/` and `src/app/api/briefing/[date]/movement/`
3. Remove Day Movement / Travel navigation links from Briefing, Launch, Closeout, Today’s Mission, Command Center, calendar day, Mission detail

Do **not** delete CampaignMission, Prepare, Execute, Debrief, Follow-up, Closeout, or Morning Launch Review code.

## Preserve data

Export before any drop:

```sql
SELECT * FROM kelly_calendar."MissionTravelPlan";
SELECT * FROM kelly_calendar."MissionTravelLeg";
SELECT * FROM kelly_calendar."MissionTravelAcknowledgement";
```

## Restore D10 behavior

- Briefing/Launch may keep reading `missionTravelPlan` as null-safe
- Revert D10 overnight “no Mission travel plan” finding if desired
- Departure preference falls back to Event travel fields

## Database rollback (last resort)

Only after export and route disable:

1. Drop `MissionTravelAcknowledgement`, `MissionTravelLeg`, `MissionTravelPlan`
2. Drop related enums
3. Regenerate Prisma client
4. Prefer leaving migration history recorded

Do not make destructive rollback automatic. Do not alter Event scheduling or Mission lifecycle during rollback.
