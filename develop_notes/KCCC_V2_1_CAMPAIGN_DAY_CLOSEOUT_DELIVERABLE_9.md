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

## Exception Digest (Deliverable 15)

Closeout navigates to `/system/briefing/[date]/exceptions`. Completing Closeout does **not** complete Exception Digest review, and digest review does **not** complete Closeout or auto-carry/resolve incidents.

## Volunteer staffing (Deliverable 19)

Closeout may link to day staffing report for review. Completing Closeout does **not** close staffing plans or auto-release assignments. Overnight wrap findings remain operator-owned on the staffing board. See `KCCC_V2_1_VOLUNTEER_STAFFING_DELIVERABLE_19.md`.

## Recommended Deliverable 10

Superseded by Deliverable 10 (Morning Launch Review). See `KCCC_V2_1_MORNING_LAUNCH_REVIEW_DELIVERABLE_10.md`.

## Recommended Deliverable 11

**Travel and Movement Operations Layer** — Mission-linked departure plans, travel legs, buffers, drivers, vehicles, lodging transitions, parking, access instructions, and arrival confirmation — without external maps or automatic routing in v1.
