# CC-10 — ICS Export & Subscription Privacy

```text
Build:         KCCC-CC-10-ICS-EXPORT-SUBSCRIPTION-PRIVACY-1.0
Authorization: ADR-098
Standing:      ADR-094
Migration:     20260722180000_cc10_ics_export_subscription
Max events:    2000 / feed or export window
```

## Mission

Permission-aware ICS export and private subscription feeds. Calendar clients subscribe or import; Kelly remains schedule source of truth. Feeds are private and signed — never public anonymous URLs.

## Modes

| Mode | Auth | Surface |
|------|------|---------|
| ONE_TIME export | Session operator | `/system/calendar/exports` · `/api/calendar/exports/*` |
| SUBSCRIPTION feed | Feed token (path) | `/api/calendar/feeds/[token]` · manage at `/system/calendar/subscriptions` |

## Models

- `CalendarSubscriptionFeed` — scope, privacy, token hash/prefix/version, visibility ceiling, status
- `CalendarSubscriptionAccessAudit` — access outcomes (OK / 304 / revoked / rate-limited / …)
- `CalendarExportAudit` — one-time export provenance

## Routes

| Kind | Path |
|------|------|
| UI | `/system/calendar/exports` |
| UI | `/system/calendar/subscriptions` · `/new` · `/[feedId]` |
| API | `/api/calendar/exports/preview` · `/download` |
| API | `/api/calendar/subscriptions` · `/[feedId]` · `/rotate` · `/revoke` |
| Public-path (token) | `/api/calendar/feeds/[token]` |

Session APIs require auth. Feed route is on the public-path allowlist **only** because the token authenticates the request — not anonymity.

## Privacy profiles

| Profile | SUMMARY | DESCRIPTION | LOCATION |
|---------|---------|-------------|----------|
| `BUSY_ONLY` | `Busy` | omitted | omitted |
| `CITY_ONLY` | authorized title | public description only | city/state |
| `OPERATIONAL_REDACTED` | authorized title | public or campaign description | venue + city/state when non-residential |

Effective profile = more restrictive of feed profile and `maxVisibilityGrant`. Never emit `streetAddress`, `privateNotes`, travel/mission ops notes.

## Token rules

- Raw token shown once: `kccc_feed_` + base64url(32 bytes)
- Store **SHA-256 hash** only; prefix for lookup/rate-limit keys
- Rotate issues new material and invalidates prior hash
- Revoke / expire / disable → feed stops serving ICS

## UID

Stable domain `kelly-calendar.netlify.app`:

- Event: `kccc-event-{eventId}@kelly-calendar.netlify.app`
- Occurrence (when keyed): `kccc-event-{eventId}-{occurrenceKey}@…`

Never embed tokens, secrets, or PII in UID.

## Recurrence strategy

1. When a supported series `RRULE` is present on the export projection → emit series `RRULE` on the VEVENT.
2. Otherwise → single VEVENT for the occurrence `Event` as stored (CC-03 times).
3. Unsupported / unsafe rules are **not** silently simplified: **omit `RRULE`** and export the occurrence Event as-is with its stable UID.

CC-04 remains recurrence authority; ICS is a read-only projection.

## Cancellation defaults

- Default export/feed statuses exclude cancelled history unless `includeCancelledHistory` / query flag is set.
- Cancelled rows map to ICS `STATUS:CANCELLED` when included.

## ETag / 304

- Weak ETag = `W/"sha256(ics-body)"`
- Matching `If-None-Match` → `304` + access audit `NOT_MODIFIED`

## Rate limits

- Feed path: strict bucket (`/api/calendar/feeds` — 60/min class)
- Additional in-service keys: `ics:feed:{prefix}`, `ics:export:{actor}`, `ics:sub-lookup:{prefix}`

## Libs / service

- `src/lib/calendar/ics/*` — types, text, UID, policy, serialize, token, bounds
- `src/server/services/calendar-ics-export-service.ts` — load, privacy, serialize, feed lifecycle

## Validator

```bash
npm run calendar:ics:validate
```

## Ship evidence

| | |
|--|--|
| Migration | `20260722180000_cc10_ics_export_subscription` |
| Validator | `calendar:ics:validate` |
| Hard deletes / Mission lifecycle / public anonymous / Phase Two | **0** |
| Feature commit | `0bbf751` |
| Netlify deploy | `6a619fa32d949535124cbabc` |
| Live URL | https://kelly-calendar.netlify.app |


CC-09 release preserved: `f8186be` · deploy `6a612a7cba0c57774db91b5f`.

CC-10 shipped: feature `0bbf751` · Netlify deploy `6a619fa32d949535124cbabc`.

**CC-11:** Health monitors subscription feeds (counts/status/access) without rotating or revoking tokens — feed lifecycle remains CC-10 operator actions.
