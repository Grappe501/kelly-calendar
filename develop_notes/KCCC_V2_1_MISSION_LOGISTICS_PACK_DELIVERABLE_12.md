# KCCC V2.1 — Deliverable 12: Mission Logistics Pack / Field Kit

**Status:** LIVE  
**Date:** 2026-07-20  
**Git:** `main` @ `5e46de9` (completes domain/server from `275f8ba`)  
**Netlify:** https://kelly-calendar.netlify.app · deploy `6a5e4ea68353c97a56f46a9a`  
**Baseline:** Travel and Movement Operations (Deliverable 11) · `274bc99`  
**Routes:** `/system/missions/[missionId]/logistics` · `/system/briefing/logistics` · `/system/briefing/[date]/logistics` · `.../report`

## Product purpose

Campaign-owned field kit / logistics pack for each Mission: pack metadata, item checklist, handoffs, return tracking, readiness findings, and accepted risk — using **manual campaign-entered data only**.

Logistics supports Mission execution. It does **not** become Mission execution.

## Deliberate exclusions (v1)

- No external inventory / warehouse / barcode systems
- No automatic item generation from Prepare or Event packing lists (signals only)
- No lazy-create on read, page load, build, validation, or navigation
- No fabrication of pack owners, item status, handoff confirmation, or quantities
- No routing, geocoding, or travel optimization (see D11)

## Schema

Additive models in `kelly_calendar`:

| Model | Role |
|-------|------|
| `MissionLogisticsPack` | Optional 1:1 with `CampaignMission` |
| `MissionLogisticsItem` | Ordered children (`sequence`) |
| `MissionLogisticsHandoff` | Planned/completed transfers (optional item link) |
| `MissionLogisticsAcknowledgement` | Issue dispositions keyed by `issueKey` |

Migration: `20260720120000_v21_mission_logistics_pack`

### Invariants

- Unique `missionId` on pack (at most one pack row per Mission)
- Lazy create on intentional Create / first save / first acknowledgement only
- Deactivating a pack does not cancel the Mission
- Mission cancellation does not delete logistics history
- `ACKNOWLEDGED` does not clear blockers; `ACCEPTED_RISK` / `RESOLVED` / `NOT_APPLICABLE` may clear for readiness presentation
- `MissionLogisticsItem` is authoritative for pack contents; Prepare `materialsNeeded` and `EventPackingItem` are signals/presentation only

## Routes

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/logistics` | Mission logistics workspace |
| `/system/briefing/logistics` | Redirect to campaign-local today |
| `/system/briefing/[date]/logistics` | Day logistics board |
| `/system/briefing/[date]/logistics/report` | Read-only print report |

API (leadership + event-scoped auth):

- `GET|POST|PATCH /api/missions/[missionId]/logistics`
- `POST /api/missions/[missionId]/logistics/items` (create or reorder)
- `PATCH|DELETE /api/missions/[missionId]/logistics/items/[itemId]`
- `POST /api/missions/[missionId]/logistics/handoffs` (create)
- `PATCH /api/missions/[missionId]/logistics/handoffs/[handoffId]` (update / confirm)
- `POST /api/missions/[missionId]/logistics/acknowledgements`
- `GET /api/briefing/[date]/logistics`

Navigation from: Mission detail, Prepare, Today’s Mission, Morning Launch, Briefing, Closeout tomorrow preview, Command Center, calendar day, Day Movement board, Mission travel workspace.

## Authorization

Leadership access (`roleHasFullCalendarAccess`) + event-scoped `EVENT_VIEW` / `EVENT_EDIT` via Mission’s source Event.

## Readiness algorithm

Deterministic findings from stored facts only (`evaluateLogisticsFindings`). Severity: BLOCKER / WARNING / INFO. Stable `issueKey`s.

### Readiness issue keys

| issueType | Typical severity | Meaning |
|-----------|------------------|---------|
| `NO_PACK` | BLOCKER | Materials indicated but no active pack |
| `CRITICAL_UNASSIGNED` | BLOCKER | Critical item without responsible owner |
| `CRITICAL_NOT_PACKED` | BLOCKER | Critical item not packed-or-better |
| `DEPARTURE_NOT_READY` | BLOCKER | Travel departure stored; critical items not ready |
| `HANDOFF_INCOMPLETE` | BLOCKER/WARNING | Active handoff not completed |
| `HANDOFF_PARTIAL_CONFIRM` | BLOCKER/WARNING | Giver/receiver confirmation mismatch |
| `MISSING_OWNER` | WARNING | No pack owner stored |
| `ITEM_INCOMPLETE` | WARNING | Active item missing description |
| `RETURN_OUTSTANDING` | WARNING | Return-required item not returned |
| `STALE_AFTER_RESCHEDULE` | WARNING | Schedule fingerprint stale |
| `STALE_AFTER_TRAVEL_CHANGE` | WARNING | Travel fingerprint stale |
| `CANCELLED_MISSION_ACTIVE_PACK` | WARNING | Cancelled Mission; active pack |
| `WRONG_CAMPAIGN_DAY` | WARNING | Pack campaign date mismatch |
| `TIME_CONFLICT` | (reserved) | Owner/time overlap (future) |
| `OWNER_OVERLAP` | (reserved) | Pack owner overlap (future) |
| `OPERATOR_ADDED` | INFO | Operator-added finding |

Derived readiness: `NOT_REQUIRED` · `NOT_READY` · `READY` · `READY_WITH_ACCEPTED_RISK`.

## Handoff semantics

- Handoffs are manual records: from/to names, optional linked item, planned/actual times and locations
- **Giver confirm** sets `giverConfirmedAt` (and typically `IN_PROGRESS`)
- **Receiver confirm** sets `receiverConfirmedAt` (and typically `COMPLETED`)
- Partial confirmation (`HANDOFF_PARTIAL_CONFIRM`) is a finding until both sides confirm or disposition is recorded
- Handoffs do not mutate Mission lifecycle or Event schedule

## ACKNOWLEDGED vs ACCEPTED_RISK

- **ACKNOWLEDGED:** Leadership saw the finding; it **remains visible** and **does not clear** readiness blockers
- **ACCEPTED_RISK:** Requires `acceptedRiskReason` for BLOCKER findings; clears for readiness presentation but **does not resolve** the underlying condition
- **RESOLVED** / **NOT_APPLICABLE:** May clear for readiness (with note where required)

## D10 / D11 / Prepare integration

| Surface | Role |
|---------|------|
| **Prepare `materialsNeeded`** | Signal that logistics may be required (`materialsIndicated`) |
| **Event `EventPackingItem`** | Legacy/presentation signal; not authoritative for pack items |
| **D11 Travel plan** | `travelPlannedDepartureAt` feeds `DEPARTURE_NOT_READY` and schedule confirm fingerprints |
| **D10 Launch / Briefing** | Logistics BLOCKER findings merge into Morning Launch Review blockers when required by stored facts; launch does not create or confirm packs |
| **MissionLogisticsItem** | Authoritative checklist for field kit operations |

Completing Morning Launch Review / launching the day does **not** create or confirm logistics packs.

## Counts (after migration apply)

| Entity | Count |
|--------|------:|
| Missions | 37 |
| Closeouts | 0 |
| Launch Reviews | 0 |
| Launch Acknowledgements | 0 |
| Travel Plans / Legs / Acks | 0 / 0 / 0 |
| Logistics Packs / Items / Handoffs / Acks | 0 / 0 / 0 / 0 |
| Fabricated logistics records | **0** |

Migration, validation, build, and report rendering create zero logistics rows.

## Validation evidence

- `npm run missions:v21:logistics-pack:validate` — **158** tests passed (D1–D12)
- D12 unit file: **13** tests
- `npm run typecheck` — pass
- `npm run build` — pass (includes `/system/missions/[missionId]/logistics` and briefing logistics routes)

## Known limitations

- No inline Prepare → pack item import (by design in v1)
- No live Execute-mode kit confirmation (recommended D13)
- `TIME_CONFLICT` / `OWNER_OVERLAP` issue types reserved, not fully evaluated

## Recommended Deliverable 13

**Field Day Ops / live kit confirmation during Execute** — evidence-based confirmation (photo/note/timestamp) that critical items are on-site and returns are captured, without external inventory systems.

## Rollback

See `KCCC_V2_1_MISSION_LOGISTICS_PACK_DELIVERABLE_12_ROLLBACK.md`.
