# D13 Field Day Operations — Rollback Companion

Non-destructive. Do **not** automate destructive database rollback.

## 1. Disable routes and navigation

- Remove or gate Field Ops links in Execute, Mission detail, Logistics, Briefing, Launch, Movement, Closeout, Command Center, DayView
- Optionally return `notFound()` from:
  - `/system/missions/[missionId]/field-ops`
  - `/system/briefing/field-ops`
  - `/system/briefing/[date]/field-ops`
  - `.../report`
- API routes under `/api/missions/[missionId]/field-ops*` and `/api/briefing/[date]/field-ops` may remain but unused

## 2. Revert application code

- Revert commits that introduced D13 domain, repository, service, APIs, UI, docs
- Restore D12 behavior: Logistics Pack remains authoritative; Execute has no Field Ops panel
- Preserve D12 tables and data

## 3. Preserve / export history

Before any schema drop, export:

- `MissionFieldOpsSession`
- `MissionFieldItemConfirmation` (includes `historyJson`)
- `MissionFieldOpsAcknowledgement`

Especially open sessions and unresolved returns.

## 4. Open sessions and returns

- Leave open sessions as historical rows if schema retained
- Do not fabricate `RETURNED` to clear Closeout
- Operators may manually disposition in a restored UI or accept risk in Closeout notes

## 5. Database rollback (only when safe)

Safe only if:

- No production confirmations need retention, **or**
- Export completed and stakeholders approve drop

Otherwise keep additive tables in place even if app code is reverted.

Migration name: `20260720130000_v21_mission_field_ops`

## 6. Restore D12 without orphaning

- D13 confirmations reference D12 items with `ON DELETE SET NULL` and snapshots
- Reverting D13 app code does not delete D12 packs/items
- Do not cascade-delete logistics to “clean up” Field Ops
