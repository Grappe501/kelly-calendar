# KCCC V2.1 — Deliverable 13: Field Day Operations / Live Kit Confirmation

**Status:** LIVE  
**Date:** 2026-07-20  
**Git:** `main` @ `d571839`  
**Netlify:** https://kelly-calendar.netlify.app · deploy `6a5e554901cc2300dca09a8a`  
**Baseline:** Mission Logistics Pack (Deliverable 12) · `c3d41f7`  
**Routes:** `/system/missions/[missionId]/field-ops` · `/system/briefing/field-ops` · `/system/briefing/[date]/field-ops` · `.../report`

## Product purpose

Timestamped on-site confirmation that critical Mission materials are physically present, with live exceptions, accepted risk, and return closure — using **D12 logistics requirements as the only checklist source**.

Field Ops supports Execute. It does **not** become Execute.

## Deliberate exclusions (v1)

- No inventory, procurement, warehouse, barcode, vendor, or replenishment systems
- No second packing checklist (D12 `MissionLogisticsItem` remains authoritative)
- No lazy-create on read, page load, build, validation, or navigation
- No fabrication of presence, damage, substitutes, actors, or timestamps
- `PACKED` / `HANDED_OFF` / `RECEIVED` never imply on-site presence
- Field Ops never rewrites D12 packing/handoff/return status
- Field Ops never starts/completes Execute, Launch, Closeout, or travel

## Schema

Additive models in `kelly_calendar`:

| Model | Role |
|-------|------|
| `MissionFieldOpsSession` | Optional 1:1 with `CampaignMission` |
| `MissionFieldItemConfirmation` | Current observation per D12 item + `historyJson` |
| `MissionFieldOpsAcknowledgement` | Issue dispositions keyed by `issueKey` |

Migration: `20260720130000_v21_mission_field_ops`

### Invariants

- Unique `missionId` on session
- Unique `(sessionId, logisticsItemId)` on confirmation
- Lazy create on intentional Open / first confirm / first acknowledgement only
- Confirmation history appends prior state into `historyJson` on replace
- `ACKNOWLEDGED` does not clear blockers
- Session status is Field Ops metadata only — independent of `MissionExecution.executionStatus`

## Independent state machines

| Machine | Controlled by |
|---------|---------------|
| Execute (`NOT_STARTED` → … → completed) | Execute Mode only |
| D12 Logistics item status | Logistics Pack only |
| D13 Field Ops session | Field Ops only |
| D10 Launch / D11 Travel / Closeout | Their own surfaces |

Opening Field Ops does not start Execute. Completing Execute does not close Field Ops or mark returns complete.

## Routes

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/field-ops` | Mission Field Ops workspace |
| `/system/briefing/field-ops` | Redirect to campaign-local today |
| `/system/briefing/[date]/field-ops` | Day Field Ops board |
| `/system/briefing/[date]/field-ops/report` | Read-only report |

Navigation from: Execute, Mission detail, Today’s Mission, Logistics, Day Logistics, Travel, Day Movement, Launch, Briefing, Closeout, Command Center, calendar day.

## Readiness issue keys

| issueType | Typical severity |
|-----------|------------------|
| `NO_PACK` | BLOCKER |
| `NO_SESSION` | BLOCKER |
| `CRITICAL_UNCONFIRMED` | BLOCKER |
| `CRITICAL_MISSING` / `DAMAGED` / `SUBSTITUTED` / `NOT_USABLE` | BLOCKER |
| `SUBSTITUTE_UNACCEPTED` | BLOCKER |
| `HANDOFF_INCOMPLETE_AT_CHECK` | BLOCKER/WARNING |
| `RETURN_OUTSTANDING` / `RETURN_MISSING` / `RETURN_DAMAGED` | WARNING/BLOCKER |
| `STALE_AFTER_LOGISTICS_CHANGE` / `RESCHEDULE` / `TRAVEL_CHANGE` | WARNING |
| `CANCELLED_MISSION_OPEN_SESSION` | WARNING |
| `WRONG_CAMPAIGN_DAY` | WARNING |
| `OVERNIGHT_WRAP_OPEN` | WARNING |

## Integration notes

- **D12:** Items remain authoritative; Field Ops stores observations only; logistics fingerprint staleness after critical requirement changes
- **D10:** May link to Field Ops; pre-arrival absence of a session does **not** auto-block launch in v1
- **D11:** Travel times display as context; arrival does not open a session; travel fingerprint may stale readiness
- **Closeout:** May show open sessions/returns; Closeout completion never fabricates returns
- **Execute:** Concise Field Ops panel/link; states remain independent

## Counts

After migration apply (2026-07-20):

| Entity | Count |
|--------|------:|
| Missions | 37 |
| Closeouts / Launches / Launch Acks | 0 / 0 / 0 |
| Travel plans / legs / acks | 0 / 0 / 0 |
| Logistics packs / items / handoffs / acks | 0 / 0 / 0 / 0 |
| Field Ops sessions / confirmations / acks | **0 / 0 / 0** |
| Fabricated field-ops records | **0** |

## Validation

- `npm run missions:v21:field-ops:validate` — **170** tests (D1–D13)
- D13 unit file: **12** tests
- `npm run typecheck` — pass
- `npm run build` — pass (includes field-ops routes)

## Volunteer staffing (Deliverable 19)

Field Ops kit confirmation and staffing day-of check-in are separate state machines. Staffing readiness ≠ Field Ops readiness. D13 does not read or mutate D19 assignment rows. See `KCCC_V2_1_VOLUNTEER_STAFFING_DELIVERABLE_19.md`.

## Recommended Deliverable 14

**Mission Exception / Incident Log during Field Ops & Execute** — structured live incident capture (safety, access, press, medical) with carry-forward into Closeout without becoming a ticketing system.

**Status:** Delivered as D14 — see `KCCC_V2_1_MISSION_INCIDENT_LOG_DELIVERABLE_14.md`.

## Recommended Deliverable 15

**Campaign Day Exception Rollup / After-Action Exception Digest** — consolidate overnight open incidents into Closeout and next-day Launch without becoming a ticketing system.

## Rollback

See `KCCC_V2_1_FIELD_DAY_OPERATIONS_DELIVERABLE_13_ROLLBACK.md`.
