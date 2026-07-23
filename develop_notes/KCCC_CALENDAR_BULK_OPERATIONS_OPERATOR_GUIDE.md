# Bulk operations operator guide

1. Open **Agenda**, **Day**, or **Week**.
2. Select Events (checkboxes or “Select for bulk”).
3. Choose an action + reason (archive/cancel) or calendar id (membership).
4. Click **Preview** — nothing changes yet.
5. Review eligible / skipped / review-required counts.
6. Confirm (type ARCHIVE or CANCEL when required).
7. Review succeeded / failed / stale results.
8. Use **Preview recovery** for archive or calendar membership inverses when available.

Hard deletion is never offered. Missions are never cancelled by bulk Event actions.

## ICS export / subscriptions (CC-10)

After bulk archive/restore, external calendars are not updated automatically. Use `/system/calendar/exports` for a one-time ICS snapshot or `/system/calendar/subscriptions` for a private live feed (rotate/revoke as needed). See `KCCC_CALENDAR_SUBSCRIPTION_OPERATOR_GUIDE.md`.
