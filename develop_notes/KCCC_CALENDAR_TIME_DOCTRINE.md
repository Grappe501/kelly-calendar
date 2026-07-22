# KCCC Calendar Time Doctrine (CC-03)

**Build:** `KCCC-CC-03-TIMEZONE-ALLDAY-OVERNIGHT-HARDENING-1.0`  
**Authority:** `src/lib/calendar/temporal/`  
**Campaign timezone:** `America/Chicago`

## Representations

### Timed Events

- Store absolute UTC instants: `startsAt`, `endsAt`
- Store IANA scheduling timezone: `timezone` (never fixed offsets like `UTC-6`)
- Edit using wall-clock date/time in the Event timezone
- Require `endsAt > startsAt` (equal rejected)
- `isMultiDay` is derived when occupied campaign-local dates > 1

### All-day Events

- `isAllDay = true`
- Stored as half-open campaign-local day span: `[start midnight, exclusive end midnight)`
- One-day all-day occupies exactly one campaign date
- Do not fabricate presentation clock times
- Do not timezone-shift the displayed date

### Overnight / multi-day timed

- End date may be later than start date
- End wall-clock earlier than start wall-clock is valid when end date is later
- One canonical Event row; views render on every occupied campaign-local date

## Timezone layers

| Layer | Role |
|-------|------|
| Event scheduling timezone | Wall-clock intent (`Event.timezone`) |
| Campaign timezone | `America/Chicago` for `campaignDateKey` and operating views |
| Stored UTC instant | Absolute `startsAt` / `endsAt` |
| Source timezone | Import provenance; may default to campaign with recorded provenance |
| Operator display | Campaign time for ops views; show Event TZ when it differs materially |

**Timezone change default:** keep the same instant unless the operator chooses “keep wall-clock time.”

## Daylight saving

- **Nonexistent (spring gap):** reject with clear validation; never silent +1 hour
- **Ambiguous (fall-back):** detect; require EARLIER or LATER; persist chosen instant
- **Duration:** always from stored instants (not assumed 24h days)

## Campaign date vs occupied dates

- Primary `campaignDateKey` = campaign-local start date
- Occupied dates = every campaign-local day whose `[dayStart, dayEnd)` intersects `[startsAt, endsAt)`
- Event ending exactly at local midnight does **not** occupy the new day
- Event starting exactly at midnight belongs to that day
- All-day exclusive end does not create an extra displayed day

## Query intersection

```
startsAt < dayEnd && endsAt > dayStart
```

Applied to Today, Day, Week, Month, Agenda, brief, command summary.

## Timed ↔ all-day conversion

- Timed → all-day: preview dates + confirm; times no longer displayed
- All-day → timed: require explicit start/end times and timezone; no invented defaults

## Import (CC-01)

- Normalize through CC-03 contracts
- Google all-day `end.date` is exclusive
- Unknown/absent TZ → campaign default with provenance note
- No silent server-TZ interpretation of floating times beyond documented default

## Boundaries

- **CC-04** owns recurrence exceptions / RRULE editing — **COMPLETE** (`KCCC_CALENDAR_RECURRENCE_DOCTRINE.md`)
- **CC-05/06** own availability / conflict engine
- Mission: Event remains schedule SoR; no Mission create/lifecycle mutation from time edits alone

## Validation

```bash
npm run calendar:time:validate
```
