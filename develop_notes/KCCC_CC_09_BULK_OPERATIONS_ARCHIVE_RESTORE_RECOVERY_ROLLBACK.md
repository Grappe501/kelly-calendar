# CC-09 Rollback

Non-destructive · manual only.

1. Disable UI: remove/hide `BulkSelectionBar` and Agenda checkboxes; keep `/system/calendar/bulk` read-only or gate with env.
2. Stop new operations: reject POST `/api/calendar/bulk` (feature flag) while allowing GET of historical ops.
3. Preserve `CalendarBulkOperation` / `Item` / `CalendarRecoveryAction` audit rows.
4. Do not reverse completed Event actions blindly — use explicit restore/recovery flows.
5. Schema revert only when empty and approved; never drop Events/Missions.
6. CC-08 Day/Week grids remain unchanged.
