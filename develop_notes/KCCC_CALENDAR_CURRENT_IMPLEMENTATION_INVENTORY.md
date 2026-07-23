# KCCC Calendar — Current Implementation Inventory

```text
Build: KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0
Date: 2026-07-21
Lane: Kelly-calendar
Purpose: Honest inventory of calendar product capability (not communications)
```

## Tracker sources (resolved)

| Source | Path | Role |
|--------|------|------|
| **Runtime step** | `src/lib/system/constants.ts` | `CURRENT_STEP_NUMBER=8`, `CURRENT_STEP_ID=KCCC-EA-8-SECURITY` |
| **Recovery roadmap** | `develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md` | Canonical calendar-centered 25-step sequence from this recovery |
| Historical registry | `docs/TWENTY_FIVE_STEP_BUILD_REGISTRY.md` | Stale product registry (Steps 4–25 still ⬜) — superseded for sequencing |
| README | `README.md` | Still says active Step 6 in places — drift |

Communications D20–D26 remain **preserved and frozen**. They are out of sequence relative to the calendar.

---

## Capability matrix

| Capability | Status | Evidence | Blocker | Next action |
| ---------- | ------ | -------- | ------- | ----------- |
| Authentication | PARTIAL | Login/session/middleware/`AuthSession`; `authenticationComplete` follows `APP_SESSION_SECRET`; status UI often hardcodes `false` | Honesty + candidate-data certification | EA-8 closeout: prove auth end-to-end; stop hardcoded false UI |
| Roles and permissions | PARTIAL | `system-roles.ts`, `authorization.ts`, calendar/event memberships | Remaining HL items; uneven enforcement surfaces | Close least-privilege gaps listed in EA-8 plan |
| Candidate-data protection | COMPLETE (gate) / BLOCKED (real data) | `candidateDataReady: false` hard in `auth-flags.ts` / security / APIs | Explicit certification never flipped | Certify checklist → flip gate only after acceptance |
| Calendar database model | COMPLETE | Prisma `Calendar*`, `Event*`, travel, staffing, people, missions | N/A for existence | Step 9: map/extend, do not duplicate |
| Event creation | PARTIAL | `/api/events` POST, `/add/*` UI, drafts | Candidate-data gate; draft-era copy | Unlock after Step 8; finish operator UX in Step 11 |
| Event editing | PARTIAL | `/api/events/[eventId]` mutations | Same | Step 11 |
| Event cancellation | PARTIAL | Archive/restore paths (soft) | Product cancel UX incomplete | Step 11 cancel/reschedule flows |
| Recurring events | COMPLETE (CC-04) | Series + exceptions + materialized Events; `/calendar/series/[id]` | Horizon extension is explicit | CC-05 gated |
| Day view | COMPLETE (CC-08) | `/calendar?view=day` time grid + bulk select | Grid-first ADR-096; CC-09 multi-select | CC-12 |
| Week view | COMPLETE (CC-08) | `/calendar?view=week` + bulk select | Same | CC-12 |
| Bulk operations | COMPLETE (CC-09) | `/system/calendar/bulk` | Preview/confirm/recovery; max 50 | N/A |
| Search/filters/saved views | COMPLETE (CC-07) | query-schema v1 · `a630c8c` · deploy `6a61167b80d9714ef4541631` | N/A | N/A |

| Month view | PARTIAL | `/calendar?view=month` | Same | Step 10 |
| Agenda view | COMPLETE (CC-03) | Campaign-local occupied days; continuation labels | N/A | CC-04 recurrence |
| Day/Week/Month membership | COMPLETE (CC-03) | Interval ∩ day; overnight/multi-day visible | N/A | Polish in CC-08 |
| Timezone / all-day / DST | COMPLETE (CC-03) | `src/lib/calendar/temporal/` + Event sheet | N/A | CC-04 DST-stable recurrence |
| Availability rules | COMPLETE (CC-05) | `CalendarAvailabilityRule`/`Exception`/`Acknowledgement`, `availability-service.ts`, `/system/calendar/availability/**` | Input/warning only; conflict persistence now implemented (CC-06) | Operator observation |
| Tuesday Little Rock rule | COMPLETE (CC-05) | Seeded standing rule via `standingPolicySeedRules` | Same | Operator observation |
| Vacation overrides | COMPLETE (CC-05) | `CalendarAvailabilityException` + `/system/calendar/availability/exceptions` | Same | Operator observation |
| Conflict detection | COMPLETE (CC-06, calendar slice) | `conflict-service.ts` detectors, `conflict-engine-service.ts`, `/api/conflicts*`, `/system/conflicts` operator queue, `EventConflictsPanel`, Day/Week/Month/Today `conflicts` merge | 4 of 8 EA-13 types (`TIME_OVERLAP`/`AVAILABILITY_VIOLATION`/`BUFFER_CONFLICT`/`TRAVEL_INFEASIBLE`); remaining EA-13 types design-only | Operator observation |
| Travel planning | PARTIAL | `EventTravelPlan`/`Segment`, mission travel, Google Routes estimate | Import-only Google; not core Today UX | Steps 14/17 |
| Participants | PARTIAL | `Person`/`EventPerson`/`Organization` | Thin event UI | Step 15 |
| Staff assignments | PARTIAL | `EventStaffAssignment` + mission staffing | Same | Steps 11/21 |
| Event preparation | PARTIAL | Objectives, packing, program-flow, mission prepare | Mission-centric vs event page | Steps 11/14 |
| Mission conversion | PARTIAL | `CampaignMission` projection from Event | Downstream of usable events | Step 14 |
| Follow-up | PARTIAL | `EventFollowup` + `MissionFollowUp` | Same | Step 19 |
| Google Calendar scaffolding | PARTIAL | OAuth + IMPORT_ONLY sync; no push | Correct freeze for now | Step 23 |
| Calendar import/export | COMPLETE (CC-10) | Import strong; ICS one-time export + private signed subscriptions | ADR-098 · migration `20260722180000_cc10_ics_export_subscription` | N/A |
| Calendar integrity console | COMPLETE (CC-02) | `/system/calendar/integrity*`, detectors `CC-02-DETECTOR-1.0`, scan/disposition models | Findings may exist in data; no auto repair | Dispositions stay on integrity; CC-11 observes |
| Calendar health dashboard | IN PROGRESS (CC-11) | `/system/calendar/health*`, `CC-11-HEALTH-1.0`, migration `20260723100000_cc11_calendar_health` | Observe/explain only (ADR-099); no auto repair | Finish ship / validate |
| Audit history | PARTIAL | `AuditLog` / `DataAccessLog` | No full operator browser | Step 8/24 |
| Mobile usability | PARTIAL | Bottom nav + mobile shell | Not certified | Step 24 |
| Communications OS (D20–D26) | COMPLETE (subsystem) / FROZEN | Deliverables + hard production blocks | Out of sequence | **No further work** until calendar Steps 14+ need it |
| LG-1 live test | BLOCKED / PAUSED | Phase B correctly blocked; credentials not installed | Recovery freeze | Do not configure |

---

## Route inventory (calendar-facing)

| Surface | Route | Notes |
|---------|-------|-------|
| Today | `/` | Today’s Mission surface exists |
| Calendar | `/calendar` | day/week/month |
| Add | `/add`, `/add/quick`, `/add/full`, `/add/templates` | Creation hub; real PII prohibited |
| Login | `/login` | Session auth |
| System status | `/system/status` | Recovery messaging updated this pass |
| Missions | `/system/missions/*` | Lifecycle UI (event command is mission-centric) |
| Google import | `/import/google-calendar*` | Scaffolding / import path |
| Communications | `/system/communications*` | **Frozen — not primary product** |

**Missing:** dedicated `/events/[eventId]` product page (operators use mission + API surfaces).

---

## Estimated completion (honest)

```text
Infrastructure and security foundation: ~65%
Usable calendar product (views + CRUD that operators trust): ~25–30%
Candidate-ready operational calendar: not ready (gate false)
Communications subsystem: advanced but disconnected / frozen
```

## Primary blockers

1. Step 8 closeout: authenticate + certify candidate-data readiness (gate flip).
2. Tracker drift (registry / README / EA constants / recovery roadmap).
3. Availability rules now enforced in create/edit/reschedule paths (CC-05); conflict-engine calendar slice (CC-06, ADR-092) now detects/persists/surfaces conflicts post-save — still never auto-mutates Events/Missions.
4. Agenda and event-detail UX gaps.
5. Communications work must not consume the build center.

## Recommended next build (do not auto-start)

```text
KCCC-EA-8-SECURITY-CLOSEOUT-1.0
```
