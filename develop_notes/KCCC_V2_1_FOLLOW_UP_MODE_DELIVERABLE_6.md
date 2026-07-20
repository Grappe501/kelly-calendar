# KCCC V2.1 — Deliverable 6: Follow-up Mode

**Status:** IMPLEMENTED  
**Date:** 2026-07-20  
**Parent:** `KCCC_V2_1_EVENTS_BECOME_MISSIONS.md`  
**Baseline:** Deliverable 5 `50475ce`

## Product purpose

Mission-scoped accountability queue. Only human-approved Debrief decisions enter the working queue. Proves who promised what, to whom, by when, and how the campaign closed the loop.

## Routes

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/follow-up` | Canonical Follow-up workspace |
| `/system/missions/[missionId]/follow-up/report` | Closeout report |
| `?mode=follow-up` | Redirects to `/follow-up` |

## Status models (separate)

- Workspace: `NOT_STARTED` → `ACTIVE` → `READY_TO_CLOSE` → `CLOSED`
- Action: `OPEN` | `IN_PROGRESS` | `WAITING` | `BLOCKED` | `COMPLETED` | `CANCELLED`
- Lifecycle / ops / prep / execution / debrief remain untouched by Follow-up mutations

## Import rule

> Nothing enters the accountable Follow-up queue without a human decision.

Sources: `approvedForFollowUp` commitments, immediate follow-ups, recommended actions, unresolved questions, lessons; people/org next steps when `followUpNeeded` + recommended step. Idempotent via `missionId::sourceType::sourceRecordId`.

## Next required action

Deterministic precedence: overdue URGENT → due-today URGENT → overdue IMPORTANT → due-today IMPORTANT → other overdue → due today → earliest due → highest undated priority → blocked. Waiting before `nextCheckAt` deprioritized. Campaign timezone for due-today.

## Closeout

Ready-to-close validates checklist in service. Close Mission requires `READY_TO_CLOSE` + approved Debrief + closeout summary. Does **not** auto-change Event schedule, lifecycle phase, or operational status.

## API

`GET|PATCH /api/missions/[missionId]/follow-up` — sections: start, import, notes, addAction, updateAction, completeAction, cancelAction, readyToClose, close.

Optimistic concurrency via `expectedUpdatedAt` on action updates → typed `CONFLICT`.

## Isolation

Follow-up keyed by `missionId`; actions keyed by `followUpId`. Reprojection never rewrites Follow-up rows.

## Deferred

Automated communications sending (D20 ships consent-aware queue with export/handoff only — provider dispatch deferred to D21), Google Tasks, global task inbox, campaign memory promotion, full offline sync, PDF export.

See `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md`.

## Migration report (`20260720080000_v21_mission_follow_up`)

Applied successfully. Counts after migrate:

| Metric | Count |
|--------|------:|
| CampaignMission | 37 |
| MissionPreparation / Execution / Debrief | 0 / 0 / 0 |
| MissionFollowUp / Actions | 0 / 0 |
| Fabricated / auto-closed | 0 |

## Recommended Deliverable 7

**Mission Command Center** — cross-Mission operating view aggregating active work, blocked/overdue commitments, Debriefs awaiting approval, and Missions ready for closeout without replacing phase workspaces.
