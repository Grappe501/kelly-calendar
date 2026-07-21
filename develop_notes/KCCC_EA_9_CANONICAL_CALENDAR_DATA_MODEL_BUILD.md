# KCCC EA-9 — Canonical Calendar Data Model Build Specification

```text
Build: KCCC-EA-9-CANONICAL-CALENDAR-DATA-MODEL-1.0
Parent recovery: KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0
Date: 2026-07-21
Prerequisite: Step 8 closeout accepted (candidate-data ready)
Status: SPEC ONLY — do not implement until authorized
```

## Design principle

**Reuse first.** The Prisma schema already contains a rich federated calendar and event graph. Step 9 must not invent a second Event or Mission concept.

Communications campaign tables are **out of scope** except optional future foreign references.

---

## Required conceptual entities → existing models

| Required concept | Existing model(s) | Action |
|------------------|-------------------|--------|
| Calendar | `Calendar`, `CalendarGroup`, memberships, rollup, saved views | **Preserve** |
| CalendarEvent | `Event` + `EventCalendarMembership` | **Preserve**; document as canonical event |
| EventParticipant | `EventPerson`, `Person`, `EventOrganization`, `Organization` | **Preserve**; deepen service APIs |
| EventLocation | `Event` location fields + `Place` / `EventGeography` | **Preserve**; normalize via service |
| EventAssignment | `EventStaffAssignment`, `EventActionItem` | **Preserve** |
| AvailabilityRule | **None** (TS policy only) | **Add** lightweight model or materialize as system events |
| ScheduleBlock | Partially via Event buffers + availability policy | **Extend** policy materialization and/or `ScheduleBlock` table |
| TravelSegment | `EventTravelSegment`, `EventTravelPlan`, `CampaignTravelLeg` | **Preserve** |
| EventPreparation | `EventObjective`, `EventPackingItem`, `EventProgramFlowItem`, `MissionPreparation` | **Preserve**; single service façade |
| EventFollowUp | `EventFollowup`, `MissionFollowUp` | **Preserve** |
| EventVisibility | `Event.visibility`, overrides, section permissions, memberships | **Preserve** |
| CalendarAuditEvent | `AuditLog`, `EventStatusHistory`, `DataAccessLog` | **Preserve**; optional typed wrapper |

---

## Models to preserve (do not duplicate)

Core: `Calendar*`, `Event`, `EventCalendarMembership`, visibility/section models, travel, staffing, people, `CampaignMission` (1:1 projection), import/Google connection models, `AuditLog`.

## Models to extend (additive)

1. **Availability / standing rules**
   - Prefer: `AvailabilityRule` + `AvailabilityOverride` (vacation) tables keyed to calendar/campaign scope
   - Or: materialize standing blocks as system `Event` rows with a dedicated type — only if it does not pollute operator calendars
2. **Recurrence operators**
   - Keep RRULE on `Event`; add series-instance override table if missing for instance edits
3. **External calendar reference**
   - Already: `ExternalEventIdentity` / import identities — ensure Event has stable external ref fields for Step 22/23

## Proposed additive changes (spec)

```text
AvailabilityRule
  id, calendarId?, campaignScopeKey, weekdayMask, startLocal, endLocal,
  timezone, kind (UNAVAILABLE|PREFERRED|DEFAULT_LOCATION),
  locationHint?, active, source (STANDING|OPERATOR)

AvailabilityOverride
  id, ruleId?, startsAt, endsAt, kind (VACATION|RELEASE|EXCEPTION),
  reasonCode, createdByUserId

ScheduleBlock (optional if not using Event materialization)
  id, eventId?, calendarId, startsAt, endsAt, blockKind
  (TRAVEL|PREP|BUFFER|WORK_UNAVAILABLE), sourceEventId?
```

Do **not** add Communications campaign models to this migration.

---

## Layer design

### Repository

- Keep Prisma repositories under `src/server/repositories/*`
- Add `availability-repository` if new tables land
- Event repository remains the write authority for schedule mutations

### Service

- `calendar-event-service` façade: create/update/cancel/reschedule/duplicate
- `availability-service`: evaluate conflicts against standing rules
- `conflict-service` (existing): accept availability blocks as inputs
- Mission projection remains additive (`projectEventToMission`)

### API

- Keep `/api/calendars`, `/api/events/*`
- Add `/api/availability/rules` (authz required) only when implementing Step 12 — Step 9 may stop at schema + services if authorized as model-only

### Authorization / privacy

- All writes require authenticated actor + calendar/event authorize
- Visibility resolved through existing policy modules
- Candidate-data ready must be true before real PII writes

### Conflict-checking hooks

On create/update/reschedule:

1. Overlap check (existing)
2. AvailabilityRule evaluation (new)
3. Travel feasibility hook (existing conflict-service) — warn, do not silent-override

### Audit

Every mutation → `AuditLog` (+ status history when status changes). Never log secrets.

---

## Migration strategy

1. Additive migrations only under `kelly_calendar` schema.
2. Backfill standing Mon–Fri / Tuesday LR rules as `AvailabilityRule` seed (no PII).
3. No destructive renames of `Event` → `CalendarEvent` in DB (document alias in code/types if desired).
4. Rollback: drop additive tables; leave Event graph intact.

## Test fixtures

- Synthetic events only until candidate-data certified (prerequisite).
- Fixtures for: work-block conflict, Tuesday default location, vacation override release.

## Acceptance criteria

```text
Canonical event write path documented and used by /api/events
No duplicate Event/Mission schemas introduced
Availability rules representable in DB (or approved materialization)
Travel/prep/follow-up attach to Event without communications dependency
Repositories/services/APIs authorization boundaries documented
Conflict hooks defined (even if full UX is Step 13)
Migration applies cleanly; rollback documented
```

## Primary implementation risk

Over-modeling: creating parallel “CalendarEvent” tables beside `Event`.  
**Mitigation:** type aliases + services; keep Prisma `Event` as the table of record.

## Existing event models (summary)

Already present and suitable as foundation: `Event` with times, timezone, location, visibility, recurrence fields, candidate attendance fields, archive/version; related staffing, travel, people, prep, follow-up, mission projection.
