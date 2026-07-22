# KCCC Calendar Recurrence Doctrine (CC-04)

**Build:** `KCCC-CC-04-RECURRENCE-OCCURRENCE-EXCEPTIONS-1.0`  
**Authority library:** `rrule` + `src/lib/calendar/recurrence/`  
**Temporal authority:** CC-03 `src/lib/calendar/temporal/`

## Authority model: **B — Series + materialized Event occurrences**

- `CalendarRecurrenceSeries` is the scheduling rule authority.
- Each bounded occurrence is a canonical `Event` row (`recurrenceSeriesId`, `originalOccurrenceAt`).
- `CalendarOccurrenceException` records MODIFIED / CANCELLED / EXCLUDED / ADDED / DETACHED.
- UI rendering never creates Event rows.
- Ordinary page loads never extend the materialization horizon.

Chosen because Missions are 1:1 with Events; existing weekly expand already materializes siblings.

## Occurrence identity

```
SHA256(seriesId | originalLocalStart | timezone | allday|timed)[:32]
```

Moving an occurrence preserves `originalOccurrenceAt` / occurrence key.

## Expansion limits

| Limit | Value |
|-------|------:|
| Preview max | 52 |
| Sync materialize max | 52 |
| Range days | 400 |
| Default horizon (no COUNT/UNTIL) | 90 days |
| Max COUNT | 104 |
| Compute budget | 2s |

## RRULE support

Supported: DAILY, WEEKLY, MONTHLY, YEARLY, INTERVAL, BYDAY, BYMONTHDAY, BYMONTH, BYSETPOS (via rrule), COUNT, UNTIL, WKST, RDATE (create), EXDATE.

Unsupported components are rejected (not silently simplified): BYWEEKNO, BYYEARDAY, BYHOUR, BYMINUTE, BYSECOND, BYEASTER, HOURLY/MINUTELY/SECONDLY.

## DST policy (generated)

- Fixed local wall time via floating RRULE shells + CC-03 `resolveWallTime`.
- Nonexistent spring wall time → occurrence `REQUIRES_REVIEW` (not silent +1h).
- Ambiguous fall-back → series `dstDisambiguation` default **EARLIER**.

## Edit scopes

| Scope | Effect |
|-------|--------|
| this | Update one Event + MODIFIED exception |
| this_and_future | End old series; create successor; move future Events |
| series | Shift non-excepted siblings; bump materializationVersion |

Never default silently to entire-series edits.

## Exception precedence

1. Current local operator exception  
2. Accepted source exception (if local timing unprotected)  
3. Series rule  
4. Import default  
5. Campaign fallback (documented only)

ADR-081 still protects local title/notes/status.

## Mission boundary

Series create / expand / materialize / cancel → **zero** automatic Missions. Mission lifecycle services remain authoritative.
