# CC-02 Rollback — Calendar Integrity & Provenance Console

## Application rollback (preferred)

1. Remove navigation links to `/system/calendar/integrity*`.
2. Feature-gate or auth-deny `CALENDAR_INTEGRITY_SCAN`, `CALENDAR_INTEGRITY_DISPOSE`, `CALENDAR_INTEGRITY_REPAIR`.
3. Revert Event-sheet provenance panel (`EventProvenancePanelView`) if needed.
4. Keep CC-01 import-provenance contracts intact.

Scans and dispositions are metadata only — disabling routes does not rewrite Events.

## Stop new scans

- Deny `CALENDAR_INTEGRITY_SCAN` for all roles, or remove POST `/api/calendar/integrity`.

## Disable repair independently

- CC-02 ships no Event-mutating repairs. `previewIntegrityRepair` is informational. Deny `CALENDAR_INTEGRITY_REPAIR` if desired.

## Database

- Tables may remain for audit history.
- Do **not** drop tables unless Steve authorizes and backups exist.
- Never `migrate reset`.
- Never delete Events as part of CC-02 rollback.

## Preserve

- CC-01 approve/merge/reject behavior
- Import provenance audit vocabulary
- Existing Event and Mission rows
