# KCCC V2.1 — Deliverable 5: Debrief Mode

**Status:** IMPLEMENTED  
**Date:** 2026-07-20  
**Parent:** `KCCC_V2_1_EVENTS_BECOME_MISSIONS.md`  
**Baseline:** Deliverable 4 `a6433c3`

## Product purpose

Structured after-action review that compares **Planned** (Mission + Prepare), **Observed** (Execute), and **Assessed** (Debrief conclusions). Bridges field capture into operator-approved Follow-up inputs without inventing outcomes.

## Routes

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/debrief` | Canonical Debrief workspace |
| `/system/missions/[missionId]/debrief/report` | Printable After-Action Report |
| `/system/missions/[missionId]?mode=debrief` | Redirects to `/debrief` |
| Today’s Mission DEBRIEF CTA | Start / Continue Debrief → `/debrief` |
| Execute Mode after end | Open Debrief |

## Status models (separate)

- `MissionDebriefStatus`: NOT_STARTED → IN_PROGRESS → COMPLETED → APPROVED
- `MissionOutcomeAssessment`: NOT_ASSESSED | ACHIEVED | PARTIALLY_ACHIEVED | NOT_ACHIEVED | INCONCLUSIVE
- Lifecycle phase / operational status / prep readiness / execution status remain untouched

## Data ownership

| Layer | Owns |
|-------|------|
| Prepare | Briefing content, readiness |
| Execute | Arrival, observations, contacts, commitments, follow-ups |
| Debrief | Outcome, criterion assessments, relationship outcomes, reviews, lessons, next actions |

Debrief **reads** Prepare/Execute; never overwrites them. Commitment reviews keep `originalText` inspectable.

## Completion vs approval

- **Complete** — checklist requirements met; sets `completedAt`
- **Approve** — leadership confirms official AAR; requires assessed outcome; sets `approvedAt` / `approvedByUserId`
- Neither mutates Event schedule or Mission lifecycle

## Follow-up handoff

Items may set `approvedForFollowUp`. Deliverable 6 consumes only those — no auto-send, tasks, or calendar writes.

## Campaign memory

Lessons may set `recommendForCampaignKnowledge` — recommendation only. Promotion deferred.

## API

`GET|PATCH /api/missions/[missionId]/debrief` — sectioned patches (`start`, `outcome`, `criteria`, …, `complete`, `approve`, `reopen`)

## Authorization

Leadership gate + EVENT_VIEW/EDIT on linked Event. Report is `robots: noindex`, force-dynamic.

## Isolation boundary

Event reprojection updates projected Mission fields only. `MissionDebrief` is keyed by `missionId` and is never rewritten by projection. PATCH rejects schedule / lifecycle / prep / execution mutation keys.

## Weak connection

Failed saves keep local text and show retry. Full offline sync deferred.

## Migration report (`20260720070000_v21_mission_debrief`)

Applied successfully via `KCCC_ALLOW_SCHEMA_MIGRATION=1` + `npm run db:migration:apply`.

| Metric | Count |
|--------|------:|
| Existing CampaignMission | 37 |
| Existing MissionPreparation | 0 |
| Existing MissionExecution | 0 |
| MissionDebrief before / after | 0 / 0 |
| Fabricated Debrief rows | 0 |
| Started / completed / approved | 0 / 0 / 0 |
| Outcome assessments fabricated | 0 |

Lazy create only — no seed of Debrief conclusions.

## Recommended Deliverable 6

**Follow-up Mode** — accountable queue from operator-approved Debrief actions, commitments, follow-ups, relationship next steps, and unresolved questions.
