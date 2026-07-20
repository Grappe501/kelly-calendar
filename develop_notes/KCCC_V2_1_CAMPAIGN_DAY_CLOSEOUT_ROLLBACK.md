# KCCC V2.1 — Campaign Day Closeout rollback

## Goal

Disable Day Closeout without altering Events, Missions, phase workspaces, Command Center, or Day Briefing.

## Steps

1. Disable routes under `src/app/system/briefing/closeout` and `src/app/system/briefing/[date]/closeout`.
2. Disable API routes under `src/app/api/briefing/[date]/closeout`.
3. Remove navigation links from Briefing, Today’s Mission, Command Center.
4. Remove domain/service/repository and `export *` from `src/lib/missions/v21/index.ts`.
5. Optionally export `CampaignDayCloseout` / `CampaignDayCarryForwardItem` rows before dropping tables.
6. Only if necessary: reverse migration `20260720090000_v21_campaign_day_closeout` (drops closeout tables/enums only).

## Preserve

All Events, CampaignMission, Prepare, Execute, Debrief, Follow-up, Command Center, Day Briefing, Today’s Mission, calendar behavior.

## Note

Closeout records are additive. Leaving tables in place after disabling routes is safe.
