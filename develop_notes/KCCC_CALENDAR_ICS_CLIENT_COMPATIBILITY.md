# Calendar ICS — Client Compatibility (CC-10)

Honest limitations. Kelly emits an RFC 5545 **subset**; clients differ.

## Timezone

- Timed events use `DTSTART`/`DTEND` with `TZID=<IANA>` and floating local wall times (Event timezone).
- A full `VTIMEZONE` component **may be omitted** when `TZID` is present. Some clients resolve IANA zones well (Apple, many Google paths); others may treat times as floating or shift incorrectly without `VTIMEZONE`.
- Prefer `America/Chicago` campaign defaults; exotic zones are best-effort.

## All-day

- Exclusive `DTEND` (DATE) per RFC. Clients that treat end as inclusive may show an extra day — rare but known class of bugs.

## Recurrence

- Partial: supported series `RRULE` may be emitted; unsupported rules are **omitted** (occurrence exported as a single VEVENT with stable UID).
- Do not expect perfect series editing round-trip in external clients — Kelly is SoR.

## Privacy

- `BUSY_ONLY` shows opaque “Busy” blocks — intentional.
- Exact residential addresses never appear; city-only or redacted operational location only.

## Feed behavior

- Token URL required; anonymous public calendars are not offered.
- Poll interval is client-controlled; `304` responses are normal when unchanged.
- After rotate/revoke, clients keep stale copies until they refresh and fail — operators must redistribute URLs.

## Not claimed

- Full RFC 5545 / every `VTIMEZONE` edge case
- Two-way sync or attendee RSVP write-back
- Identical rendering across Apple / Google / Outlook
