# KCCC Step 6 — Mobile Command Shell (Increment 1)

**Script ID:** `KCCC-STEP-06-MOBILE-COMMAND-SHELL`  
**Status:** IN PROGRESS  
**Date:** 2026-07-18  

## Scope this increment

- Authenticated Today command surface using safe event projections
- Live `/api/command-summary/today`
- Loading UI + shell chrome (bottom nav hidden on login)
- Structural gates S6-A / S6-B / S6-C; S6-D lighthouse kept as target with a11y baseline

## Out of scope

- Step 5.7 redesign / DB rewiring
- Step 7 full event CRUD UI
- Step 8 deep leave-by / readiness / conflict command center
- Real candidate PII (`candidate_data_ready` remains false)

## Validation

```powershell
npm run step6:validate
npm run typecheck
npm run test
```
