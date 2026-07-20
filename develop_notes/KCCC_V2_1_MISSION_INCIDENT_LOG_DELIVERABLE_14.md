# KCCC V2.1 — Deliverable 14: Mission Exception / Incident Log

**Status:** LIVE (pending Netlify verification after ship)  
**Date:** 2026-07-20  
**Baseline:** Field Day Operations (Deliverable 13) · `378e599`  
**Routes:** `/system/missions/[missionId]/incidents` · `/system/missions/[missionId]/incidents/[incidentId]` · `/system/briefing/incidents` · `/system/briefing/[date]/incidents` · `.../report`

## Product purpose

Structured operational exception capture during Field Ops and Execute: safety, access, press, travel, logistics, and other live incidents — with timeline, severity, carry-forward into Closeout, and optional soft link to Follow-up Mode.

The Incident Log supports campaign leadership. It does **not** summon emergency services or become a ticketing system.

## Emergency disclaimer

`EMERGENCY_NOTICE` (shown on every workspace, detail, and day board):

> For an immediate threat to life or safety, contact local emergency services and follow campaign emergency procedures. This log does not summon assistance.

## Deliberate exclusions (v1)

- No emergency dispatch, 911 integration, or automated alerting
- No lazy-create on read, page load, build, validation, or navigation
- No fabrication of incidents, updates, actors, or timestamps
- No mutation of Execute, Field Ops, logistics, travel, launch, or Closeout state from incident actions
- No automatic Follow-up Mode action creation (soft link only)
- No full ticketing / assignment / SLA workflow

## Schema

Additive models in `kelly_calendar`:

| Model | Role |
|-------|------|
| `MissionIncident` | Per-Mission exception record with ref, category, severity, status, sensitivity |
| `MissionIncidentUpdate` | Append-only timeline (observations, status/severity changes, resolution) |
| `MissionIncidentAcknowledgement` | Issue dispositions keyed by `issueKey` |

Migration: `20260720140000_v21_mission_incident_log`

## Counts (after migration apply)

| Entity | Count |
|--------|------:|
| Missions | 37 |
| Closeouts / Launches / Launch Acks | 0 / 0 / 0 |
| Travel plans / legs / acks | 0 / 0 / 0 |
| Logistics packs / items / handoffs / acks | 0 / 0 / 0 / 0 |
| Field Ops sessions / confirmations / acks | 1 / 0 / 0 |
| Incidents / updates / acks | **0 / 0 / 0** |
| Fabricated incident records | **0** |

## Validation

- `npm run missions:v21:incidents:validate` — **183** tests (D1–D14)
- D14 unit file: **13** tests
- `npm run typecheck` — pass
- `npm run build` — pass

### Invariants

- Unique `(campaignDateKey, incidentRef)` for human-readable refs within a day
- Incidents belong to exactly one `CampaignMission` and inherit its campaign date key
- Updates append; prior status/severity captured on change-type updates
- `ACKNOWLEDGED` does not clear blockers
- Archive is soft (`isArchived`, `archivedAt`) — narrative retained
- `linkedFollowUpActionId` is a soft string link (no FK) with `linkedFollowUpImportKey` for idempotent import semantics

## Routes

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/incidents` | Mission incident workspace (list + create) |
| `/system/missions/[missionId]/incidents/[incidentId]` | Incident detail (timeline, ack, archive, carry-forward, follow-up link) |
| `/system/briefing/incidents` | Redirect to campaign-local today |
| `/system/briefing/[date]/incidents` | Day incident board |
| `/system/briefing/[date]/incidents/report` | Read-only, privacy-aware report |

## API (force-dynamic, leadership + event-scoped auth)

Leadership access (`roleHasFullCalendarAccess`) + `EVENT_VIEW` / `EVENT_EDIT` via Mission’s `sourceEventId`.

| Method | Path |
|--------|------|
| `GET` | `/api/missions/[missionId]/incidents` — workspace |
| `POST` | `/api/missions/[missionId]/incidents` — create |
| `GET` | `/api/missions/[missionId]/incidents/[incidentId]` — detail |
| `PATCH` | `/api/missions/[missionId]/incidents/[incidentId]` — patch fields |
| `POST` | `/api/missions/[missionId]/incidents/[incidentId]/updates` — append update |
| `POST` | `/api/missions/[missionId]/incidents/[incidentId]/acknowledgements` |
| `POST` | `/api/missions/[missionId]/incidents/[incidentId]/archive` |
| `POST` | `/api/missions/[missionId]/incidents/[incidentId]/carry-forward` |
| `POST` | `/api/missions/[missionId]/incidents/[incidentId]/link-follow-up` |
| `GET` | `/api/briefing/[date]/incidents` — day board |

Service methods (`mission-incident-service`): `getMissionIncidentsWorkspace`, `getIncidentDetail`, `createMissionIncident`, `patchMissionIncident`, `appendIncidentUpdate`, `acknowledgeIncidentIssue`, `archiveMissionIncident`, `markCarryForward`, `linkFollowUpAction`, `getDayIncidentBoard`.

## Privacy

| Sensitivity | Board / report | Detail (non-leadership) |
|-------------|----------------|---------------------------|
| `STANDARD` | Full summary | Full |
| `RESTRICTED` | Summary shown | Narrative redacted |
| `CONFIDENTIAL` | Summary hidden on board | Narrative redacted |

Leadership roles with full calendar access see full narrative via `redactIncidentForViewer`. Day board uses `redactForBoard` (confidential summary omitted).

## Readiness issue keys

| issueType | Typical severity |
|-----------|------------------|
| `OPEN_HIGH_CRITICAL` | BLOCKER |
| `EXECUTE_COMPLETED_OPEN` | BLOCKER/WARNING |
| `STABILIZED_UNRESOLVED` | WARNING |
| `CARRY_FORWARD_REQUIRED` | WARNING |
| `FOLLOW_UP_REQUIRED_UNLINKED` | WARNING |
| `CANCELLED_MISSION_ACTIVE` | WARNING |
| `UPDATED_AFTER_CLOSEOUT` | WARNING |
| `OVERNIGHT_ACTIVE` | WARNING |
| `MISSING_OWNER` | WARNING |
| `RESOLUTION_NOTE_MISSING` | WARNING |
| `OPERATOR_ADDED` | INFO |

## Integration notes

- **D13 Field Ops:** Independent state; incidents may reference field context but do not mutate session status
- **D4 Execute:** Nav panel + link; execution completion does not auto-close incidents
- **D9 Closeout:** `carryForwardRequired` / `carriedForwardAt` surface for evening review; Closeout does not fabricate resolution
- **D6 Follow-up:** `linkFollowUpAction` sets soft link + `followUpRequired`; does not create Follow-up actions
- **D10 Launch:** May reference open high/critical incidents in future digest (see D15)

## Navigation

Concise **Incidents** / **Day Incidents** links added to: Execute, Mission detail, Field Ops, Logistics, Travel, Today’s Mission, Day Logistics, Day Field Ops, Day Movement, Launch, Briefing, Closeout, Command Center, calendar DayView, Follow-up (mission link).

## Validation (after migration apply)

- `npm run typecheck`
- `npm run build` (includes incident routes)
- Domain unit tests when added to `missions:v21:incident-log:validate`

## Recommended Deliverable 15

**Campaign Day Exception Rollup / After-Action Exception Digest** — consolidate overnight open incidents (high/critical, carry-forward required, unlinked follow-up) into Closeout summary and next-day Morning Launch Review without becoming a ticketing system. Read-only rollup + explicit leadership acknowledgement; no auto-assignment or SLA engine.

## Rollback

See `KCCC_V2_1_MISSION_INCIDENT_LOG_DELIVERABLE_14_ROLLBACK.md`.
