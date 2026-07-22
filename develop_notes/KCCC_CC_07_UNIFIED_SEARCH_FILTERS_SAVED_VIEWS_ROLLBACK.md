# CC-07 Rollback — Unified Search, Filters & Saved Views

```text
Never automate destructive rollback.
Preserve Events, Missions, conflicts, availability, and CC-06 behavior.
```

## Disable UI

1. Feature-flag or remove `CalendarSearchChromeHost` from Today/Day/Week/Month/Agenda.
2. Restore Agenda local-only search if needed.
3. Leave APIs in place (read-only) or return 503 from `/api/calendar/search*`.

## Saved views

- Preserve all `CalendarSavedView` rows.
- Disable sharing/default separately by ignoring `visibility` / `isDefault` in UI.
- Do not delete operator-created views.

## Schema

- Additive columns may remain.
- To reverse indexes only: drop `CalendarSavedView_*_idx` created by CC-07 migration — optional.
- Do **not** drop columns that contain operator query JSON without an export.

## Restore prior queries

Per-view loaders (`listEventsForActorInRange`) remain the operating-view source of truth. Removing CC-07 chrome restores prior behavior without Event mutation.
