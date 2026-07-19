# KCCC Step 6 — Mobile Command Shell (Increment 1)

**Script ID:** `KCCC-STEP-06-MOBILE-COMMAND-SHELL`  
**Status:** IN PROGRESS  
**Date:** 2026-07-18  

## Increment 1 (shipped)

- Authenticated Today command surface using safe event projections
- Live `/api/command-summary/today`
- Loading UI + shell chrome (bottom nav hidden on login)
- Structural gates S6-A / S6-B / S6-C; S6-D lighthouse kept as target with a11y baseline

## Increment 2 — Mission Cards (this pass)

- Events reframed as Mission Cards (next / where / when / why)
- Readiness + risk from OI `calculateEventReadiness`
- Owner + immediate action CTA (one-thumb)
- Leave By slot reserved via `leave-by-contract` (`not_computed`) for 6.3

## Out of scope

- Step 5.7 redesign / DB rewiring
- Step 7 full event CRUD UI
- Step 6.3 Leave By Engine computation
- Real candidate PII (`candidate_data_ready` remains false)

## Validation

```powershell
npm run step6:validate
npm run typecheck
npm run test
```
