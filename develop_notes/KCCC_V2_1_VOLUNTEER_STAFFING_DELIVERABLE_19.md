# KCCC V2.1 — Volunteer Staffing and Assignment Reconciliation (Deliverable 19)

**Status:** Live on `main`  
**Feature commit:** `6422591`  
**Deploy ID:** `6a5e78e3cbc466ee73d04534` · https://kelly-calendar.netlify.app  
**Baseline:** D18 `main` @ `67608e9` · 231 tests · observations/matches/correlations 0 · person-level apply disabled  
**D1–D19 validation:** 241 tests passed (`npm run missions:v21:staffing:validate`; D19 adds 10)  
**Counts after migration/build:** Missions 37 · Events 38 · D18 observations/matches/correlations 0 · local people 0 · staffing plans/requirements/assignments/acks **0** · fabricated **0**  
**Mobilize availability context:** Read-only aggregate signals from D18 observations when present — **RSVP ≠ assignment**  
**Person-level apply (D18):** Remains disabled — `CONFIRMED_EXTERNAL_REF` assignments require `ExternalPersonMatch.status = CONFIRMED` only; no consent inference  

## Product purpose

Mission-scoped volunteer **role requirements**, explicit **staffing assignments**, **coverage gap** findings, **Mobilize RSVP availability context** (read-only), **cancellation reconciliation** signals, and **day-of staffing confirmation** — without auto-assigning people, auto-creating Person records, or inferring communication consent.

Staffing supports Launch and day operations. It does **not** become Execute, Field Ops, Logistics, or Mobilize attendance writes.

## Deliberate exclusions (v1)

- No auto-assign from Mobilize RSVP, attendance, or name matching
- No Person auto-create from Mobilize or staffing surfaces
- No consent inference from signup, `sms_opt_in_status`, or contact hints
- No Mobilize people or attendance **writes**
- No messaging, SMS, email, or outbound volunteer comms
- Does **not** mutate Prepare, Execute, Debrief, Follow-up, Travel, Logistics, Field Ops, Incidents, Closeout, Launch Review, or day launch authorization
- Page loads, build, validation, and navigation do **not** lazy-create staffing plans

## Semantics

| Concept | Rule |
|---------|------|
| Requirement | Role slot definition (`requiredCount`, `minimumCount`, criticality) — **≠ assignment** |
| Assignment | Explicit operator-owned link of identity → requirement with status lifecycle |
| Mobilize RSVP | Availability **context** only — **≠ commitment**, **≠ assignment** |
| Remote `attended` (D18) | Observation only — **≠ staffing check-in** |
| Staffing `CHECKED_IN` | Day-of staffing confirmation — **≠ Execute start**, **≠ Field Ops check-in** |
| Staffing readiness | Independent of Field Ops, Logistics, and Execute readiness |
| `ACKNOWLEDGED` | Records operator awareness — **does not clear blockers** |

## Identity targets

| `targetType` | Rule |
|--------------|------|
| `CAMPAIGN_USER` | Existing campaign user id |
| `LOCAL_PERSON` | Existing local Person id (no auto-create) |
| `MANUAL_SCOPED` | Display label **required**; optional `manualContactHint` — **not consent** |
| `CONFIRMED_EXTERNAL_REF` | Only when linked `ExternalPersonMatch.status = CONFIRMED`; `DO_NOT_LINK` / `AMBIGUOUS` / unreviewed blocked |

Optional `mobilizeObservationId` on an assignment links D18 observation for cancellation reconciliation display only — assignment status is **never** auto-changed when Mobilize shows cancellation.

## Models / migration

`20260720190000_v21_volunteer_staffing`

| Model | Role |
|-------|------|
| `MissionStaffingPlan` | Optional 1:1 with `CampaignMission`; lazy-created on intentional open |
| `MissionStaffingRequirement` | Role requirements per plan (`roleKey` unique per plan) |
| `MissionStaffingAssignment` | Explicit identity → requirement with status lifecycle |
| `MissionStaffingAcknowledgement` | Issue dispositions keyed by `issueKey` |

### Plan status

`DRAFT` → `IN_PROGRESS` → `READY` | `READY_WITH_RISK` → `WRAP_PENDING` → `CLOSED`

### Assignment status

`PROPOSED` → `ASSIGNED` → `CONFIRMED` → `CHECKED_IN` | `RELEASED` | `NO_SHOW`  
Also: `DECLINED`, `CANCELLED` (operator transitions only)

### Invariants

- Unique `missionId` on plan
- Unique `(staffingPlanId, roleKey)` on requirement
- Lazy create on intentional Open / first requirement / first assignment / first acknowledgement only
- `confirmationFingerprint` captures schedule + requirements + assignment facts at staffing confirmation; drift sets `isStale`
- `ACKNOWLEDGED` does not clear blockers (`ACCEPTED_RISK`, `RESOLVED`, `NOT_APPLICABLE` may)
- Staffing plan status is staffing metadata only — independent of `MissionExecution.executionStatus` and Field Ops session status

## D18 read boundary

D19 **reads** D18 `MobilizeAttendanceObservation` aggregates and optional per-assignment observation links. D19 does **not**:

- Import or sync Mobilize on page load
- Treat signup counts as staffed headcount
- Auto-propose assignments from observations
- Enable D18 person-level apply

See `KCCC_V2_1_MOBILIZE_SIGNUP_ATTENDANCE_READ_DELIVERABLE_18.md`.

## Coverage findings (deterministic)

From stored facts only — no skill inference, no RSVP-as-commitment:

| issueType | Typical severity |
|-----------|------------------|
| `CRITICAL_ROLE_UNCOVERED` | BLOCKER |
| `CRITICAL_ROLE_SHORT` | BLOCKER |
| `ROLE_COVERAGE_GAP` | WARNING |
| `CHECKIN_BELOW_MINIMUM` | BLOCKER / WARNING |
| `STAFFING_PLAN_STALE` | WARNING |
| `ASSIGNMENT_CANCELLED_AFTER_CONFIRM` | WARNING |
| `MOBILIZE_CANCELLATION_LINKED` | WARNING |
| `DUPLICATE_ASSIGNMENT` | WARNING |
| `OVERLAPPING_MISSION_ASSIGNMENT` | WARNING |
| `MULTI_ROLE_SAME_MISSION` | INFO |
| `CANCELLED_MISSION_ACTIVE_PLAN` | WARNING |
| `OVERNIGHT_WRAP_PENDING` | INFO |
| `STAFFING_REQUIRED_NO_ROLES` | BLOCKER |

Launch Review may surface staffing blockers when `staffingRequired` and open BLOCKER findings remain uncleared.

## Routes

| Route | Role |
|-------|------|
| `/system/missions/[missionId]/staffing` | Mission staffing workspace |
| `/system/briefing/staffing` | Redirect to campaign-local today |
| `/system/briefing/[date]/staffing` | Day staffing board |
| `/system/briefing/[date]/staffing/report` | Read-only day staffing report |

APIs:

- `GET` / `PATCH` `/api/missions/[missionId]/staffing`
- `GET` `/api/briefing/[date]/staffing`

Navigation from: Mission detail, Command Center, Today's Mission, Execute, Logistics, Field Ops, Travel, Launch, Briefing, Closeout, calendar day (read-only cross-links where noted).

## Validation

```bash
npm run missions:v21:staffing:validate
```

Includes D1–D19 unit suite (`tests/unit/missions/v21-staffing.test.ts`).

## Migration report (expected)

Applied via `KCCC_ALLOW_SCHEMA_MIGRATION=1` + staffing migration apply script (see operator guide).

| Metric | Count |
|--------|------:|
| Existing CampaignMission | 37 |
| Existing Event | 38 |
| D18 observations / matches / correlations | 0 / 0 / 0 |
| Local Person | 0 |
| Staffing plans / requirements / assignments / acks | **0 / 0 / 0 / 0** |
| Fabricated staffing records | **0** |

## Isolation boundary

`assertStaffingIsolation()` — staffing mutations touch only D19 models. Event reprojection, Execute, Field Ops, Logistics, Mobilize adapter writes, and Launch/Closeout day authorization remain independent.

## Operator guide

See `KCCC_V2_1_VOLUNTEER_STAFFING_OPERATOR_GUIDE.md`.

## Rollback

See `KCCC_V2_1_VOLUNTEER_STAFFING_DELIVERABLE_19_ROLLBACK.md`.

## Recommended D20

**Campaign Communications and Mobilization Queue** — consent-aware channel eligibility, audience review, message approval, Mobilize event links, and delivery audit **without** inferring consent or auto-sending messages.

**Shipped as:** `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_QUEUE_DELIVERABLE_20.md` (commit/deploy TBD pending ship).
