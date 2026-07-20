# D14 Mission Incident Log — Rollback Companion

Non-destructive. Do **not** automate destructive database rollback.

## 1. Disable routes and navigation

- Remove or gate Incidents links in Execute, Mission detail, Field Ops, Logistics, Travel, Briefing, Launch, Movement, Closeout, Command Center, DayView, Follow-up
- Optionally return `notFound()` from:
  - `/system/missions/[missionId]/incidents`
  - `/system/missions/[missionId]/incidents/[incidentId]`
  - `/system/briefing/incidents`
  - `/system/briefing/[date]/incidents`
  - `.../report`
- API routes under `/api/missions/[missionId]/incidents*` and `/api/briefing/[date]/incidents` may remain but unused

## 2. Revert application code

- Revert commits that introduced D14 APIs, UI, navigation, and docs
- Preserve D13 Field Ops and D12 Logistics behavior
- Domain/service/repository from prior passes may remain if migration already applied — gate UI only if partial rollback

## 3. Preserve / export history

Before any schema drop, export:

- `MissionIncident`
- `MissionIncidentUpdate`
- `MissionIncidentAcknowledgement`

Especially open high/critical incidents, carry-forward required rows, and restricted/confidential narrative.

## 4. Open incidents and carry-forward

- Leave open incidents as historical rows if schema retained
- Do not fabricate `RESOLVED` or archive to clear Closeout
- Operators may manually disposition in a restored UI or accept risk in Closeout notes

## 5. Database rollback (only when safe)

Safe only if:

- No production incident history needs retention, **or**
- Export completed and stakeholders approve drop

Otherwise keep additive tables in place even if app code is reverted.

Migration name: `20260720140000_v21_mission_incident_log`

## 6. Restore D13 without orphaning

- D14 incidents reference `CampaignMission` with cascade on mission delete
- Reverting D14 app code does not delete Field Ops or logistics data
- Do not cascade-delete missions or field ops to “clean up” incidents

## 7. Follow-up soft links

- `linkedFollowUpActionId` is not an FK — reverting D14 does not delete Follow-up actions
- Orphan link strings may remain on Follow-up rows; safe to ignore after rollback
