# KCCC V2.1 — Provider Integration Architecture (Mobilize)

**Status:** D18 live — gated Event publishing + privacy-scoped attendance read; person/attendance writes still disabled  
**Date:** 2026-07-20  
**Docs revision inspected:** `1025d0f` (2024-03-27) from https://github.com/mobilizeamerica/api  
**Local system of record:** CampaignMission / Event / operational V2.1 models  
**Provider:** `ExternalProvider.MOBILIZE`  
**Mapping:** `ExternalObjectReference` (+ connection / sync run / candidate / checkpoint / publication / attendance observation)

## Boundaries

| Concern | Rule |
|---------|------|
| System of record | Local KCCC for Events/Missions/Field Ops. Mobilize for remote signup/attendance IDs and observed status. |
| Adapter | Server-only (`src/features/mobilize-integration`). |
| Secrets | `MOBILIZE_API_KEY` in env only — never DB, client, logs, or errors. |
| Outbound writes | Create/update gated by flags. Delete disabled. Attendance/people writes forced off. |
| Person-level import | Disabled — local Person lacks consent-aware authority. |
| Sync failures | Must not block briefing/digest/launch/Mission ops. |
| Page loads | Never start remote sync. |

## Attendance read (D18)

See `KCCC_V2_1_MOBILIZE_SIGNUP_ATTENDANCE_READ_DELIVERABLE_18.md` and `KCCC_V2_1_MOBILIZE_ATTENDANCE_PRIVACY_OPERATOR_GUIDE.md`.

Signup ≠ attendance ≠ check-in ≠ Execute. Aggregates keep counts separated. Custom signup / referrer fields deny-by-default.

## Publishing

See `KCCC_V2_1_MOBILIZE_EVENT_PUBLISHING_DELIVERABLE_17.md`.

## Volunteer staffing (D19)

See `KCCC_V2_1_VOLUNTEER_STAFFING_DELIVERABLE_19.md`. D19 consumes D18 observation aggregates as read-only availability context. RSVP ≠ assignment. No Mobilize people/attendance writes. Person-level apply remains disabled.

## Recommended D17

Mobilize Event Publishing and Bidirectional Reconciliation with explicit preview/approval.
