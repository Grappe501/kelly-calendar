# KCCC V2.1 — Deliverable 2: Today’s Mission Operating Surface

**Status:** IMPLEMENTED  
**Date:** 2026-07-20  
**Parent:** `KCCC_V2_1_EVENTS_BECOME_MISSIONS.md`  
**Depends on:** Deliverable 1 (`CampaignMission` at `61be2ae`)

## Homepage product decision

`/` is no longer a calendar overview. It is the campaign’s immediate operating surface:

> What is Kelly’s mission right now, and what should the campaign do next?

One primary mission leads. Calendar is secondary navigation (`Open calendar` link + existing `/calendar` routes).

## Selection precedence

Pure function: `selectTodaysMission` in `src/lib/missions/v21/select-todays-mission.ts`.

1. `EXECUTE`
2. `TRAVEL`
3. `DEBRIEF`
4. `FOLLOW_UP`
5. `PREPARE` (today)
6. Next upcoming mission
7. Empty / no-mission state

Within the same phase: currently underway → nearest start → mission id.

Uses **MissionLifecyclePhase only**. Does **not** use MissionOperationalStatus or legacy Mission Card status (`PENDING` / `IN_PROGRESS` / …). Those systems are not interchangeable.

## Campaign timezone

`today` is computed with `getPublicAppConfig().campaignTimezone` (default `America/Chicago`) via `Intl` date keys — never raw UTC day boundaries.

Lifecycle phase is recomputed at read time from Event signals (travel / outcome / follow-ups) without mutating Event scheduling columns.

## View-model contract

`MissionHomeViewModel` + `TodaysMissionResult` in `src/lib/missions/v21/mission-home-view-model.ts`.

Server: `getTodaysMissionResult()` / `getMissionHomeViewModelById()` in `todays-mission-service.ts`.

Public API `/api/events/[eventId]/mission` remains for client consumers; homepage uses the service directly (no self-HTTP).

## Empty-state behavior

Shows “No active mission is scheduled.” with restrained links to calendar, mission index, and event entry. Does **not** auto-create Event or Mission.

## Mission detail

`/system/missions/[missionId]` — internal operational record (objective, criteria, intelligence, readiness, projection metadata). Phase CTAs use `?mode=` with honest forthcoming notes. Full Prepare/Travel/Execute/Debrief/Follow-up workspaces are **not** built here.

## Relationship to calendar

Calendar unchanged as planning/navigation. Home does not lead with a month grid.

## Relationship to legacy Mission Cards

Step 6 Mission Cards (`src/lib/missions/mission-card.ts`, `MissionStatus`) remain for command/today panels elsewhere. Deliverable 2 home surface uses V2.1 `CampaignMission` only. Do not silently map statuses across systems.

## Known limitations

- Phase CTAs open the mission record; deeper phase UIs are forthcoming (Deliverable 3 = Prepare Mode).
- Detail route is system-admin gated (`KELLY` / `CAMPAIGN_MANAGER`).
- Readiness is a checklist / Ready·Needs Attention·Draft — not a fabricated percentage.
- Intelligence is display-only of stored fields — never invented.

## Deferred (Deliverable 3 entry)

**Prepare Mode**: briefing structure, readiness gaps, people/org context, talking-point inputs, travel requirements, operator-owned edits — real destination for “Open Mission Brief.”
