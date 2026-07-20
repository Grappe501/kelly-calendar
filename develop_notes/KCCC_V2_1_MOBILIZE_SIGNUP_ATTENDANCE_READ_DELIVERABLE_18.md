# KCCC V2.1 — Mobilize Signup and Attendance Read Integration (Deliverable 18)

**Status:** Live on `main`  
**Feature commit:** `26e1952`  
**Deploy ID:** `6a5e726e7a6dd749d494af2d` · https://kelly-calendar.netlify.app  
**Baseline:** D17 `main` @ `52619ec` · 222 tests · publications 0 · `NOT_CONFIGURED`  
**D1–D18 validation:** 231 tests passed  
**Counts after ship:** Missions 37 · Events 38 · observations/matches/correlations/refs/publications/connections/runs 0 · local people 0 · fabricated 0  
**Credential-tested attendance:** Pending — no Mobilize API key  
**Person-level apply:** Disabled (no consent-aware Person authority)  


## Official API documentation (reverified)

| Field | Value |
|--|--|
| Repository | https://github.com/mobilizeamerica/api |
| Revision | `1025d0f` (2024-03-27) |
| Inspection date (D18) | 2026-07-20 |
| People list | `GET /v1/organizations/:organization_id/people` |
| Org attendances | `GET /v1/organizations/:organization_id/attendances` (`updated_since`) |
| Event attendances | `GET /v1/organizations/:organization_id/events/:event_id/attendances` |
| Attendance statuses | `REGISTERED`, `CANCELLED`, `CONFIRMED` |
| `attended` | bool \| null (unset ≠ no-show) |
| Timeslot | nested `timeslot.id` |
| Person identity | `id` / `person_id` / `user_id`; email/phone/address arrays |
| Referrer | UTM fields — **denied by default** |
| Custom signup fields | deny-by-default; counted only |
| Auth | Bearer HTTPS |
| Rate limits | 15 read/s · 5 write/s · 429 |
| Live credential testing | **Pending** — no API key |

## Discovery conclusion

Local `Person` lacks consent-aware communication fields. Therefore **person-level apply remains disabled** in D18. Aggregate observations + match-review architecture + explicit check-in correlation ship instead.

## Semantics

- Mobilize `REGISTERED`/`CONFIRMED` = signup/RSVP, **not** attendance, **not** local check-in, **not** Execute.
- Mobilize `attended=true` = remote attendance observation only.
- Correlation links observation ↔ local check-in/Field Ops record without rewriting either source.

## Models / migration

`20260720180000_v21_mobilize_attendance_read`

- `MobilizeAttendanceObservation`
- `ExternalPersonMatch`
- `MissionAttendanceCorrelation`

## Flags

- `MOBILIZE_IMPORT_ATTENDANCE_ENABLED` (default off)
- Person-level apply forced off (`PERSON_LEVEL_APPLY_ENABLED = false`)

## Routes

- `/system/integrations/mobilize/attendance`
- `/system/integrations/mobilize/attendance/[eventId]`
- `/system/integrations/mobilize/people/matches`
- `/system/integrations/mobilize/attendance/runs/[runId]`
- APIs under `/api/integrations/mobilize/attendance/*` and `/api/integrations/mobilize/people/matches`

## Validation

```bash
npm run missions:v21:mobilize-attendance:validate
```

## Recommended D19

**Volunteer Staffing and Assignment Reconciliation** — Mission role requirements, Mobilize RSVP availability, explicit volunteer-to-role assignment, coverage gaps, cancellations, and day-of confirmation without auto-assigning people or inferring consent.
