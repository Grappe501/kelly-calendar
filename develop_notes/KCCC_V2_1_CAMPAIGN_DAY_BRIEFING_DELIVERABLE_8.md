# KCCC V2.1 — Deliverable 8: Campaign Day Briefing

**Status:** LANDED  
**Date:** 2026-07-20  
**Routes:** `/system/briefing/today` · `/system/briefing/[YYYY-MM-DD]`  
**Baseline:** Mission Command Center (Deliverable 7) · production commit lineage on `main`

## Product purpose

Authoritative daily operating packet for Kelly and campaign leadership. Answers what today looks like, where Kelly needs to be, what must be prepared, what is due, what leadership must decide, and what tomorrow’s team should know tonight.

Reports what the system knows, what it does not know, and what requires a human decision. Not a calendar printout, not a dashboard copy, not an AI strategy memo.

## Audience

- Candidate (Kelly)
- Campaign manager
- Senior leadership
- Authorized operations staff

Two reading modes: fast morning scan (phone) and full operational review (desktop / print).

## Routes and navigation

| Route | Behavior |
|-------|----------|
| `/system/briefing/today` | Auth gate → campaign-local today → redirect to `/system/briefing/YYYY-MM-DD` |
| `/system/briefing/[date]` | Date-scoped Briefing (`YYYY-MM-DD`) |

Navigation from: Today’s Mission, Mission Command Center, Mission detail, Calendar day view. Homepage remains Today’s Mission. Command Center is not replaced.

Metadata: generic title/description only; `robots: noindex,nofollow`. `dynamic = "force-dynamic"`.

## Schema decision

**No persistence.** Derived read model only. No `CampaignDayBriefing` table. Briefing persistence rows: **0**.

Schema would be justified only for acknowledgement, deliberate snapshot, confirmed departure, or day-level leadership note — deferred to a future deliverable.

## Campaign timezone and date behavior

- Timezone: `getPublicAppConfig().campaignTimezone` (expected `America/Chicago`) — not hard-coded in multiple files.
- Day bounds: `00:00:00`–`23:59:59` campaign-local via `campaignDayBounds`.
- Allowed range: past **30** days through next **90** days (`DEFAULT_DAY_BRIEFING_CONFIG`).
- Invalid / out-of-range dates → `notFound()` (no silent default to today).
- UTC midnight and DST handled via campaign-local key helpers shared with Today’s Mission.

### Day kind labels

| Kind | Label |
|------|-------|
| Today | (no “Future/Historical” label) |
| Past | Historical briefing |
| Future | Future briefing |

Historical disclaimer (live derivation):

> This historical briefing reflects the current state of campaign records, not a preserved snapshot from that date.

## Architecture

| Layer | Path |
|-------|------|
| Domain | `src/lib/missions/v21/day-briefing/*` |
| Repository | `src/server/repositories/campaign-day-briefing-repository.ts` |
| Service | `src/server/services/campaign-day-briefing-service.ts` |
| UI | `src/components/briefing/day/*` |
| Pages | `src/app/system/briefing/today` · `src/app/system/briefing/[date]` |

### Query strategy

One bounded `findMany` with selective includes for Event travel signals + Prepare / Execute / Debrief / Follow-up. No per-Mission N+1. Private notes omitted from select. Follow-up actions capped (`take: 60`). Section caps applied server-side. Tomorrow preview uses the same load window, filtered in service.

## Briefing status (derived)

| Status | Rule sketch |
|--------|-------------|
| `READY_TO_REVIEW` | Missions exist; no critical prep gap |
| `NEEDS_PREPARATION` | Upcoming Mission with unready / missing prep |
| `ACTIVE_DAY` | At least one Mission arrived / in progress (not on future dates) |
| `DAY_COMPLETE` | Scheduled Missions ended; no active execution |
| `NO_SCHEDULED_MISSIONS` | No Event-linked Mission for the date |

## Executive summary

Deterministic fact list + template sentences from persisted counts. No AI narrative. Counts include scheduled Missions, first/final times, primary Mission, first stored departure, preparation risks, due today, overdue, leadership decisions, top attention item.

## Primary Mission selection

| Date kind | Selector |
|-----------|----------|
| Today | Existing `selectTodaysMission` exactly |
| Future | Earliest scheduled Mission; stable Mission ID tie-break |
| Historical | Unique executed Mission if exactly one; else earliest executed; else earliest scheduled; stable ID |

Compressed read-only card: objective, success criteria, key message, who to find, cannot forget, next action CTAs into Prepare / Execute / Debrief / Follow-up. Missing fields use honest empty copy (never TBD).

## Timeline

Chronological entries with provenance. Types: `DEPARTURE`, `ARRIVAL_TARGET`, `MISSION_START`, `MISSION_END`, `PREPARATION_DUE`, `FOLLOW_UP_DUE`, `APPROVAL_REQUIRED`, `INTERNAL`.

Ordering: timed entries first (earliest campaign-local time → type precedence → stable ID), then date-only due items, then undated attention. All-day shows `All day` (no fabricated midnight clock). Overlaps detected and surfaced as schedule risks without mutating Events.

## Travel

Stored Event / EventTravelPlan / Prepare logistics only. Never map services, mileage, or guessed duration. Missing departure / duration labeled honestly. Movement chain lists known destinations only.

## Preparation

Cross-Mission incomplete tasks and missing structured fields (key message, purpose, logistics, people/org briefs, materials, `DRAFT` / `NEEDS_ATTENTION`). Ranked by soonest Prepare Mission, critical logistics, materials, message, purpose, people/org, then noncritical tasks. Links open Prepare Mode.

## Messages, people, organizations

Mission-specific Prepare fields only. No talking-point generation. People/orgs not merged without stable identity; duplicate stable IDs flagged (“Appears in N Missions today”). No endorsement claims.

## Due today / overdue

Due-today queue grouped by Commitments / Mission follow-up / Preparation / Approvals / Questions. Overdue is a separate ranked list (urgent commitment first). Date-only items are not overdue at the start of their due day. Waiting actions with `nextCheckAt` today included. Completed / cancelled excluded. Briefing does not complete actions.

## Leadership decisions

Derived from existing workflows only (Debrief approval, ready-to-close, blockers, schedule conflict, prep leadership review, integrity). Links to canonical workspaces — no approval buttons on the Briefing.

## Risks

Reuse Command Center attention rules + Briefing-specific schedule / integrity detections. Severities: Immediate / Needs attention / Review (human labels). Traceable to source records.

## End-of-day / tomorrow

Record-based responsibilities only (`EXECUTION_STILL_ACTIVE`, Debrief pending, open due actions, tomorrow prep/departure gaps, leadership pending). Derived end-of-day status: Clear / Work remains / Leadership review remains / Active execution remains. Tomorrow preview is a compact link-out, not a nested full Briefing.

## No-Mission day

Still operational: due / overdue / approvals / prep for upcoming / tomorrow. Summary states responsibility remains — never “day off.”

## Future / historical behavior

- Future: planned/scheduled/prepared language; integrity warning if execution rows exist early; no fabricated “actual” outcomes.
- Historical: live-record disclaimer; shows current execution/debrief/follow-up state.

## Refresh, stale, print

- Manual refresh (same date URL). Server-rendered on request.
- Client stale warning after **15** minutes (`staleWarningMinutes`).
- Print stylesheet hides nav/chrome; expands collapsible sections; includes generated timestamp. Same authorization as page.

## Authorization and privacy

`requireSystemAdminPage` on today + date routes. No public static generation. Private full notes excluded from payload and selects. No private content in metadata / OG / analytics.

## Read-only boundary

Navigate, refresh, print, change date, expand sections, open canonical workspaces. No mutations to Events, Mission lifecycle, operational status, Prepare/Execute/Debrief/Follow-up, or legacy Mission Cards. No notifications, AI, external research, or automated delivery.

## Validation

```text
npm run missions:v21:day-briefing:validate
```

Also: D1–D7 validate scripts, `npx tsc --noEmit`, `npm run build`.

## Known limitations

- No morning snapshot / acknowledgement persistence
- No AI assistant layer
- No automated email/SMS delivery
- Departure times never estimated from maps
- Historical pages are live-derived, not immutable archives
- Section limits truncate with overflow counts + Command Center links

## Recommended Deliverable 9

**Briefing acknowledgement + optional morning snapshot** — persist that leadership reviewed the packet (and optionally freeze that morning’s derived view), still without AI or automated delivery.
