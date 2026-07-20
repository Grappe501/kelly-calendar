# KCCC V2.1 — Deliverable 9: Campaign Day Closeout

**Status:** LANDED  
**Date:** 2026-07-20  
**Routes:** `/system/briefing/closeout` · `/system/briefing/[YYYY-MM-DD]/closeout` · `.../report`  
**Baseline:** Campaign Day Briefing (Deliverable 8)

## Product purpose

Evening verification and handoff: confirm today’s Mission work was captured, deliberately carry forward what remains, and assess tomorrow readiness. The day is not closed merely because the clock says it is over.

## Schema

Additive models in `kelly_calendar`:

- `CampaignDayCloseout` — keyed by `campaignDateKey` (`YYYY-MM-DD`), statuses `NOT_STARTED` → `IN_PROGRESS` → `REVIEWED` → `SIGNED_OFF`
- `CampaignDayCarryForwardItem` — day-level handoff ledger with idempotent `importKey`

**Lazy persistence.** Migration creates **zero** closeout or carry-forward rows. No day is auto-reviewed or signed off.

Timezone: `getPublicAppConfig().campaignTimezone`. Allowed dates: today through previous **14** days. Future closeout rejected.

## Architecture

| Layer | Path |
|-------|------|
| Domain | `src/lib/missions/v21/day-closeout/*` |
| Repository | `src/server/repositories/campaign-day-closeout-repository.ts` |
| Service | `src/server/services/campaign-day-closeout-service.ts` |
| Mission load | Reuses `loadMissionsForDayBriefing` (no N+1) |
| APIs | `/api/briefing/[date]/closeout/*` |
| UI | `src/components/briefing/closeout/*` |

## Hard boundaries

Closeout may mutate only day-level review / carry-forward / signoff. It must not end execution, complete/approve Debriefs, complete Follow-up, close Missions, or change Event schedules.

Signoff means the day was responsibly reviewed — not that underlying work is complete.

## Validation

```text
npm run missions:v21:day-closeout:validate
```

## Recommended Deliverable 10

**Briefing acknowledgement + optional morning snapshot** (or closeout amendment audit trail) — still without AI or automated delivery.
