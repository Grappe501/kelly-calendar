# KCCC V2.1 — Morning Launch Review Rollback

Use this if Deliverable 10 must be disabled without harming Events Become Missions Deliverables 1–9.

## Disable routes (preferred first step)

1. Remove or gate pages under:
   - `src/app/system/briefing/launch/`
   - `src/app/system/briefing/[date]/launch/`
2. Remove or gate APIs under:
   - `src/app/api/briefing/[date]/launch/`
3. Remove navigation links labeled Launch Today / Morning Launch Review from:
   - Day Briefing
   - Day Closeout tomorrow preview
   - Today’s Mission
   - Mission Command Center
   - Calendar day view

Do **not** delete CampaignMission, Prepare, Execute, Debrief, Follow-up, Command Center, Day Briefing, or Day Closeout code.

## Disable mutations

Stop accepting:

- `POST .../launch/start`
- `PATCH .../launch`
- `POST .../launch/acknowledgements`
- `PATCH .../launch/acknowledgements/[id]`
- `POST .../launch/review`
- `POST .../launch/launch-day`

Read-only report may remain if useful for audit, or return 404 with routes.

## Preserve data

Export before dropping tables if needed:

```sql
SELECT * FROM kelly_calendar."CampaignDayLaunchReview";
SELECT * FROM kelly_calendar."CampaignDayLaunchAcknowledgement";
```

Preserve:

- Events / calendar behavior
- CampaignMission rows and lifecycle
- Prepare / Execute / Debrief / Follow-up records
- Command Center
- Day Briefing (derived)
- Day Closeout + carry-forward

## Remove models (last resort)

Only after export and route disable:

1. Drop `CampaignDayLaunchAcknowledgement` then `CampaignDayLaunchReview`
2. Drop related enums in `kelly_calendar`
3. Remove Prisma models/enums and regenerate client
4. Remove migration history row only if your ops process requires it — prefer leaving applied migration recorded

## Must not happen during rollback

- No Event schedule edits
- No Today’s Mission selector changes beyond removing Launch nav
- No Mission lifecycle / operational status changes
- No Prepare / Execute / Debrief / Follow-up status changes
- No Day Closeout source mutation
- No fabricated “un-launch” of Missions
