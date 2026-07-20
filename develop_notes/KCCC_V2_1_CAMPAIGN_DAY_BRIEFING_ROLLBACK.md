# KCCC V2.1 — Campaign Day Briefing rollback

## Goal

Disable Campaign Day Briefing routes without altering Events, Missions, phase workspaces, Command Center, or Today’s Mission.

## Steps

1. Remove or gate:
   - `src/app/system/briefing/today/`
   - `src/app/system/briefing/[date]/`
2. Remove navigation links from Today’s Mission, Command Center, Mission detail.
3. Remove domain/service/repository and `export *` from `src/lib/missions/v21/index.ts`.
4. Remove `missions:v21:day-briefing:validate` and validate script if desired.
5. Remove briefing CSS / print rules from `globals.css` if desired.

## Preserve

All Events, CampaignMission rows, Prepare/Execute/Debrief/Follow-up data, Command Center, Today’s Mission, calendar behavior.

## Persistence note

Deliverable 8 creates **zero** Briefing rows. No migration rollback required.
