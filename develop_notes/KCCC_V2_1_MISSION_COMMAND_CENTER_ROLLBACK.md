# KCCC V2.1 — Mission Command Center rollback

## Goal

Disable the Mission Command Center surface without altering Mission, Event, Prepare, Execute, Debrief, or Follow-up data.

## Safe rollback steps

1. **Disable the route**  
   Remove or gate `src/app/system/missions/command-center/` (page / loading / error). Optionally redirect `/system/missions/command-center` → `/`.

2. **Remove navigation links** from:
   - `TodaysMissionSurface.tsx`
   - Prepare / Execute / Debrief / Follow-up workspace navs
   - `MissionDetailView.tsx`
   - Mission index page

3. **Remove service/repository usage**  
   Delete or stop importing:
   - `mission-command-center-service.ts`
   - `mission-command-center-repository.ts`
   - `src/lib/missions/v21/command-center/*`
   - export from `src/lib/missions/v21/index.ts`

4. **Remove validate script**  
   Drop `missions:v21:command-center:validate` from `package.json` and delete `scripts/missions-command-center-validate-v21.mjs` if desired.

5. **Preserve all records**  
   No schema migration was added for Deliverable 7. Rollback does not touch Prisma models or rows.

## Must not change during rollback

- Today’s Mission (`/`) selection and UI  
- Event scheduling fields  
- Lifecycle selectors (`projectLifecyclePhase`)  
- Prepare / Execute / Debrief / Follow-up workspaces and APIs  
- Legacy Mission Cards  

## Data note

Command Center creates **zero** persisted rows. Disabling the UI leaves all CampaignMission and phase data intact.
