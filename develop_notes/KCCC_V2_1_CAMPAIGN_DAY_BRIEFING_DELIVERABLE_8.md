# KCCC V2.1 — Deliverable 8: Campaign Day Briefing

**Status:** LANDED  
**Date:** 2026-07-20  
**Routes:** `/system/briefing/today` · `/system/briefing/[YYYY-MM-DD]`  
**Baseline:** Mission Command Center (Deliverable 7)

## Product purpose

Authoritative daily operating packet for Kelly and campaign leadership. Reports what the system knows, what it does not know, and what requires a human decision. Not a calendar printout, not a dashboard copy, not AI strategy.

## Audience

Candidate, campaign manager, senior leadership, authorized operations. Fast morning scan + full operational review / print.

## Schema decision

**No persistence.** Derived read model. Briefing persistence rows: **0**.

## Campaign timezone

`getPublicAppConfig().campaignTimezone` (America/Chicago). Day bounds `00:00:00`–`23:59:59` campaign-local via `campaignDayBounds`.

Allowed range: past 30 days through next 90 days (`DEFAULT_DAY_BRIEFING_CONFIG`).

## Architecture

| Layer | Path |
|-------|------|
| Domain | `src/lib/missions/v21/day-briefing/*` |
| Repository | `src/server/repositories/campaign-day-briefing-repository.ts` |
| Service | `src/server/services/campaign-day-briefing-service.ts` |
| UI | `src/components/briefing/day/*` |
| Pages | `src/app/system/briefing/today` · `src/app/system/briefing/[date]` |

### Query strategy

One bounded `findMany` with selective includes for Event travel signals + Prepare/Execute/Debrief/Follow-up. No per-Mission N+1. Private notes omitted from select. Section caps server-side.

## Key rules

- **Today primary Mission:** existing `selectTodaysMission`
- **Future primary:** earliest scheduled Mission (stable ID tie-break)
- **Historical primary:** executed Mission if unique, else earliest
- **Departure / duration:** only from Event / EventTravelPlan — never fabricated
- **Risks:** reuse Command Center attention rules + schedule overlap detection
- **Historical pages:** live-record disclaimer (not a snapshot)
- **Future pages:** no fabricated “actual” execution language; integrity warning if execution rows exist
- **Read-only:** navigate / refresh / print / change date only

## Validation

```text
npm run missions:v21:day-briefing:validate
```

## Recommended Deliverable 9

**Briefing acknowledgement + optional morning snapshot** — persist that leadership reviewed the packet (and optionally freeze that morning’s derived view), still without AI or automated delivery.
