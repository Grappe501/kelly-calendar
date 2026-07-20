# KCCC V2.1 — Campaign Day Briefing rollback

## Goal

Disable Campaign Day Briefing routes and navigation without altering Events, Missions, phase workspaces, Command Center, Today’s Mission, or calendar scheduling behavior.

## Steps

1. **Disable routes** — remove or feature-gate:
   - `src/app/system/briefing/today/`
   - `src/app/system/briefing/[date]/`
2. **Remove navigation links** from:
   - `src/components/missions/TodaysMissionSurface.tsx`
   - `src/components/missions/command-center/MissionCommandCenter.tsx`
   - `src/components/missions/MissionDetailView.tsx`
   - `src/components/calendar/DayView.tsx` (Briefing + Command Center links)
3. **Remove domain / service / repository**
   - `src/lib/missions/v21/day-briefing/**`
   - `src/server/services/campaign-day-briefing-service.ts`
   - `src/server/repositories/campaign-day-briefing-repository.ts`
   - `export *` from `src/lib/missions/v21/index.ts`
   - UI under `src/components/briefing/day/**`
4. **Remove validate script** — `scripts/campaign-day-briefing-validate-v21.mjs` and `missions:v21:day-briefing:validate` from `package.json` if desired.
5. **Remove print / briefing CSS** from `src/app/globals.css` (`.campaign-day-briefing`, `@media print` briefing rules) if desired.
6. **No API route was required** for Deliverable 8 default path — if a Briefing API was added later, disable it here.

## Preserve

- All Events and Event schedules
- All `CampaignMission` rows and lifecycle / operational status
- Prepare, Execute, Debrief, Follow-up data
- Mission Command Center behavior
- Today’s Mission selector and homepage
- Calendar day/week/month views (aside from removing the Briefing link)
- Google integration (untouched by this deliverable)

## Persistence note

Deliverable 8 creates **zero** Briefing persistence rows. **No migration rollback** is required.
