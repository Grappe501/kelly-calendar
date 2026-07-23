# Calendar subscription & export — Operator Guide (CC-10)

## Create a subscription

1. Open `/system/calendar/subscriptions/new`.
2. Name the feed; choose scope (date range, relative window, saved view, or canonical query).
3. Choose privacy profile (`BUSY_ONLY` / `CITY_ONLY` / `OPERATIONAL_REDACTED`).
4. Confirm status inclusions and cancelled-history default.
5. Create — **copy the subscription URL / token immediately**. It is shown once.

## Password / secret warning

Treat the feed URL like a password. Anyone with the URL can fetch the ICS until you rotate or revoke. Do not paste into public chats, tickets, or shared docs. Prefer personal calendar accounts over shared mailboxes.

## Rotate

On `/system/calendar/subscriptions/[feedId]`, rotate when a URL may have leaked. Old URL stops working; update every client with the new URL.

## Revoke

Revoke when the feed is no longer needed or compromise is confirmed. Revocation is immediate for new fetches; previously downloaded copies are not recalled.

## One-time export

`/system/calendar/exports` — preview then download a `.ics` file for a bounded window. Prefer subscriptions for ongoing sync; use export for ad-hoc share or archive.

## Client setup

| Client | Typical path |
|--------|----------------|
| Apple Calendar | File → New Calendar Subscription → paste HTTPS feed URL |
| Google Calendar | Other calendars → From URL → paste feed URL |
| Outlook | Add calendar → From internet → paste feed URL |
| Generic | Any client that supports HTTPS iCalendar subscribe |

Clients poll on their own interval; Kelly serves ETag/`304` when unchanged.

## Import vs subscribe vs two-way

| Mode | Meaning |
|------|---------|
| **Import** | One-time file download — static snapshot |
| **Subscribe** | Live private feed — client refreshes; Kelly remains SoR |
| **Two-way** | **Not supported** in CC-10 — no write-back to Google/Outlook |

Further detail: `KCCC_CALENDAR_ICS_CLIENT_COMPATIBILITY.md` · doctrine `KCCC_CALENDAR_ICS_EXPORT_DOCTRINE.md`.
