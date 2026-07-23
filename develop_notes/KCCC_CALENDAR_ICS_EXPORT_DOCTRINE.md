# Calendar ICS Export Doctrine (CC-10)

```text
Authority: ADR-082 · ADR-084 · ADR-098
RFC:       5545 subset (not full iCalendar)
```

## Privacy & access

- Feeds are **private and signed** — no public anonymous subscription URL (ADR-082).
- Exact **private/residential** locations are redacted; prefer `CITY_ONLY` or `BUSY_ONLY` (ADR-084).
- Effective visibility = intersection of feed privacy profile and creation-time `maxVisibilityGrant`.

## Field policy

| Include | Never include |
|---------|---------------|
| Authorized title (or `Busy`) | `streetAddress` |
| Public / campaign description per profile | `privateNotes`, travel/mission ops notes |
| City/state; non-residential venue when allowed | Raw tokens / secrets in UID or text |
| Stable UID, SEQUENCE, STATUS, DTSTAMP | Fabricated VTIMEZONE required for every client |

Projection must pass through `applyIcsPrivacyPolicy` before serialize.

## RFC 5545 subset

- `VCALENDAR` + `VEVENT`; `METHOD:PUBLISH`; CRLF + line folding
- Timed: `DTSTART`/`DTEND` with `TZID=` (floating local in Event timezone)
- All-day: `VALUE=DATE` with **exclusive** `DTEND` (day after last inclusive day)
- Optional `RRULE` / `EXDATE` / `RDATE` / `RECURRENCE-ID` when safe
- `VTIMEZONE` may be omitted when `TZID` is present (client-dependent — see compatibility note)

## Stable UID domain

`kccc-event-{id}[@occurrence]@kelly-calendar.netlify.app` — stable across re-export; never embeds PII or feed tokens.

## Recurrence (export)

Series RRULE when present and safe; otherwise single occurrence VEVENT. Unsupported rules: omit RRULE — do not silently simplify.

## Boundaries

- Read-only projection of Events authorized for the actor / feed grant.
- No Google write-back, no two-way sync, no Mission create/cancel from export.
- CC-03 owns time; CC-04 owns recurrence authority; ICS consumes both read-only.
