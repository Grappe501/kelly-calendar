# KCCC V2.1 — Deliverable 4: Execute Mode

**Status:** IMPLEMENTED  
**Date:** 2026-07-20  
**Parent:** `KCCC_V2_1_EVENTS_BECOME_MISSIONS.md`  
**Baseline:** Deliverable 3 `3860772`

## Product purpose

Phone-first field workspace for live mission execution. Compresses Prepare briefing into what matters on-site: arrival, objective, key message, people/orgs, observations, commitments, immediate follow-ups. Not a second Prepare Mode. Not Debrief.

## Route

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/execute` | Canonical Execute workspace |
| `/system/missions/[missionId]?mode=execute` | Redirects to `/execute` |
| `/` Today’s Mission CTA | → `/execute` when lifecycle phase is Execute |

## Execution status model

`MissionExecutionStatus`: `NOT_STARTED` → `ARRIVED` → `IN_PROGRESS` → `COMPLETED`

Separate from:

- Mission lifecycle phase
- Mission operational status
- Preparation readiness
- Legacy Mission Card status

## Data ownership

| Layer | Owns |
|-------|------|
| Prepare | Strategic purpose, key message, people/org context, readiness |
| Execute | Arrival/start/end, observations, contact results, commitments, follow-ups, field notes |

Execute **reads** Prepare; never overwrites it.

## Behavior

- **Mark Arrived** — sets `arrivedAt`, optional note; no Event/lifecycle mutation
- **Begin Mission** — sets `startedAt` → `IN_PROGRESS`
- **End Active Mission** — sets `endedAt` → `COMPLETED`; Debrief CTA is forthcoming placeholder
- Lazy create on first PATCH; migration seeds zero execution rows

## API

`GET|PATCH /api/missions/[missionId]/execution` — sectioned patches (`arrive`, `start`, `complete`, `observations`, …)

## Authorization

Leadership gate + EVENT_VIEW/EDIT on linked Event. `robots: noindex`.

## Mobile / weak connection

Sticky primary action, large taps, stacked cards. Failed saves keep local text and show retry — no full offline sync.

## Deferred

Debrief Mode, Travel Mode, Follow-up Mode, geolocation, notifications, AI analysis, full offline queue.

## Migration report (`20260720060000_v21_mission_execution`)

Applied successfully via `KCCC_ALLOW_SCHEMA_MIGRATION=1` + `npm run db:migration:apply`.

| Metric | Count |
|--------|------:|
| Existing CampaignMission | 37 |
| Existing MissionPreparation | 0 |
| MissionExecution before | 0 |
| MissionExecution after | 0 |
| Fabricated execution rows | 0 |
| Marked arrived / started / complete | 0 / 0 / 0 |

Lazy create only — no seed of field activity.

## Isolation boundary

Event reprojection updates projected Mission fields only. `MissionExecution` is keyed by `missionId` and is never rewritten by projection. Execution PATCH rejects Event schedule fields and Mission lifecycle / operational / preparation readiness mutations.

## Recommended Deliverable 5

**Debrief Mode** — consume Prepare + Execute records for results, lessons, commitments, follow-up decisions, and operator-approved after-action report.
