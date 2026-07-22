# CC-04 Rollback Companion

## Preferred rollback

1. Redeploy prior Netlify production build (application only).
2. Leave `CalendarRecurrenceSeries` / `CalendarOccurrenceException` tables in place (forward-only).
3. Preserve Event IDs, Mission links, CC-01 provenance, CC-02 findings, CC-03 times.

## Disable mutations without data loss

- Feature-flag or revert routes under `/api/calendar/recurrence` and occurrence cancel.
- Keep series workspace read-only.
- Stop calling `createRecurringSeries` from quick-add (restore prior weekly ms-step only if needed).

## Schema

Do **not** DROP tables in production without an explicit Steve-authorized plan. New enums/tables are additive.

## Never automate

- Hard deletion of materialized Events
- Mission deletion because an occurrence was excluded
- Unlimited reverse materialization
