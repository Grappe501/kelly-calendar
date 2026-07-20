# KCCC — Mobilize publishing & conflict-resolution operator guide (D17)

## Who

Owner / Campaign Manager only (`assertMobilizeIntegrationAdmin`).

## Before credentials

1. Open `/system/integrations/mobilize/publishing`.
2. Enter a local Event id → Preview.
3. Confirm eligibility issues, privacy warnings, and proposed payload.
4. Approve binds fingerprints (expires ~1h). Changing the Event invalidates approval.
5. Publish stays blocked until `MOBILIZE_API_KEY` + org + `MOBILIZE_PUBLISHING_ENABLED`.

## With credentials (when available)

1. Verify connection on `/system/integrations/mobilize` (read probe only — no write probe).
2. Set `MOBILIZE_PUBLISHING_ENABLED=1` and/or `MOBILIZE_UPDATES_ENABLED=1`.
3. Set `MOBILIZE_DEFAULT_CONTACT_EMAIL` (required contact — never invent).
4. Preview → Approve → Publish.
5. On timeout / unknown outcome: **Refresh remote** before any retry.

## Conflicts

1. `/system/integrations/mobilize/conflicts`
2. Choose Keep local / Keep remote explicitly.
3. Never last-write-wins.

## Timeslots

PUT replaces the upcoming timeslot collection. Remote-only timeslots must be included or they will be deleted by Mobilize — the UI/API blocks accidental omission.

## Deletion

Remote delete is **disabled by default** and remains blocked in the D17 production path even if the flag is set, until explicit post-credential authorization.

## Attendance (D18)

Linked from publishing event panel → `/system/integrations/mobilize/attendance/[eventId]`. Signup counts are separate from remote `attended` and from local check-in correlation.


## Do not

- Publish from Mission-only surfaces without the Event publication page
- Expect Mission create/cancel to touch Mobilize
- Blind-retry creates after ambiguous network errors
