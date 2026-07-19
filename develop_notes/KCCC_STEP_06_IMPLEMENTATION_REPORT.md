# KCCC Step 6 — Mobile Command Shell (Increment 1)

**Script ID:** `KCCC-STEP-06-MOBILE-COMMAND-SHELL`  
**Status:** IN PROGRESS  
**Date:** 2026-07-18  

## Increment 1 (shipped)

- Authenticated Today command surface using safe event projections
- Live `/api/command-summary/today`
- Loading UI + shell chrome (bottom nav hidden on login)
- Structural gates S6-A / S6-B / S6-C; S6-D lighthouse kept as target with a11y baseline

## Increment 2 — Mission Cards

- Events reframed as Mission Cards (next / where / when / why)
- Readiness + risk from OI `calculateEventReadiness`
- Owner + immediate action CTA (one-thumb)
- Mission Status field (Pending / In Progress / Complete / Needs Attention)

## Increment 3 — Mission Timeline Engine

- Pure `computeMissionTimeline` engine (deterministic_v1)
- Leave By as first computed capability (no external traffic/maps)
- Timeline projected into Mission Card `leaveBy` + UI timeline block
- Engine kept separate from UI; Today consumes via server wiring

## Increment 4 — Today’s Readiness

- Actionable readiness categories: Schedule / Travel / People / Materials / Location / Communications / Follow-up
- Mission states: Ready / Needs Attention / Blocked / Unknown (never silent Ready)
- Today summary: counts + top issue + one-thumb corrective action
- Consumes existing OI `EventReadinessResult`; Timeline Engine unchanged

## Increment 5 — One-tap completion (this pass)

- Actions: Start mission / Mark arrived / Mark complete / Needs attention
- `POST /api/events/[eventId]/mission-day` via authenticated mutation contract
- RBAC (`EVENT_EDIT`), version/409 conflict protection, idempotent accepts, audit per transition
- Optimistic UI avoided — wait for server confirmation; clear retry on failure/409
- Shared `OPENAI_API_KEY` present for future advisory AI only (no autonomous mutations)
- Timeline + readiness engines unchanged

## Out of scope

- Step 5.7 redesign / DB rewiring
- Step 7 full event CRUD UI
- External traffic / mapping integrations
- Fake assignments / materials / completion
- Real candidate PII (`candidate_data_ready` remains false)

## Validation

```powershell
npm run step6:validate
npm run typecheck
npm run test
```
