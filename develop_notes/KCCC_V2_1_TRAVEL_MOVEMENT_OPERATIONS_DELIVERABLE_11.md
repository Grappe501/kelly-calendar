# KCCC V2.1 — Deliverable 11: Travel and Movement Operations

**Status:** LANDED  
**Date:** 2026-07-20  
**Baseline:** Morning Launch Review (Deliverable 10) · `f01c534`  
**Routes:** `/system/missions/[missionId]/travel` · `/system/briefing/movement` · `/system/briefing/[date]/movement` · `.../report`

## Product purpose

Campaign-owned travel support for departures, ordered legs, buffers, drivers, vehicles, passenger/movement notes, readiness findings, and accepted risk — using **manual campaign-entered data only**.

Travel supports Mission execution. It does **not** become Mission execution.

## Deliberate exclusions (v1)

- No Google Maps / geocoding / traffic / distance / route optimization
- No automatic routing or automatic departure-time changes
- No fabrication of departure, destination, duration, driver, vehicle, buffer, or route
- No lazy-create on read, page load, build, validation, or navigation

## Schema

Additive models in `kelly_calendar`:

| Model | Role |
|-------|------|
| `MissionTravelPlan` | Optional 1:1 with `CampaignMission` |
| `MissionTravelLeg` | Ordered children (`sequence`) |
| `MissionTravelAcknowledgement` | Issue dispositions keyed by `issueKey` |

Migration: `20260720110000_v21_mission_travel_movement`  
Does **not** use or mutate legacy `EventTravelPlan` / `CampaignTravelLeg` (Google estimate) tables.

### Invariants

- Unique `missionId` on plan (at most one plan row per Mission)
- Lazy create on intentional Create / first save / first acknowledgement only
- Deactivating a plan does not cancel the Mission
- Mission cancellation does not delete travel history
- Driver/vehicle findings only when `driverRequired` / `vehicleRequired` are true
- `ACKNOWLEDGED` does not clear blockers; `ACCEPTED_RISK` / `RESOLVED` / `NOT_APPLICABLE` may clear for readiness presentation

## Routes

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/travel` | Mission travel workspace |
| `/system/briefing/movement` | Redirect to campaign-local today |
| `/system/briefing/[date]/movement` | Day movement board |
| `/system/briefing/[date]/movement/report` | Read-only print report |

Navigation from: Mission detail, Today’s Mission, Morning Launch, Briefing, Closeout tomorrow preview, Command Center, calendar day.

## Authorization

Leadership access (`roleHasFullCalendarAccess`) + event-scoped `EVENT_VIEW` / `EVENT_EDIT` via Mission’s source Event. Server validates Mission ownership; client IDs are not trusted.

## Readiness algorithm

Deterministic findings from stored facts only (`evaluateTravelFindings`). Severity: BLOCKER / WARNING / INFO. Stable `issueKey`s. Derived readiness: `NOT_REQUIRED` · `NOT_READY` · `READY` · `READY_WITH_ACCEPTED_RISK`.

## D10 integration

- Briefing snapshot includes optional `missionTravelPlan` summary
- Launch Review prefers Mission plan departure over Event travel departure
- Missing Mission travel plan surfaces when Event `travelRequired` is true
- Completing Morning Review / launching the day does **not** create or confirm travel plans
- Travel edits do not change Launch Review status

## Validation

```text
npm run missions:v21:travel-movement:validate
```

Schema apply (diverged history):

```text
KCCC_ALLOW_SCHEMA_MIGRATION=1 node scripts/apply-day-travel-migration.mjs
```

## Known limitations / recommended D12

**Deliverable 12 (landed):** Mission Logistics Pack / Field Kit — see `KCCC_V2_1_MISSION_LOGISTICS_PACK_DELIVERABLE_12.md`.

**Recommended Deliverable 13:** Field Day Ops — live kit confirmation during Execute with evidence-based capture.
