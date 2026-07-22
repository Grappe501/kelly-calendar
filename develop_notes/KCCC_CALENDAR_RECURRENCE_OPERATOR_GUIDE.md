# Calendar Recurrence — Operator Guide (CC-04)

## Create a series

1. Start from Quick add (weekly count) or the recurrence API with an RRULE.
2. Preview shows the first occurrences, timezone, and truncation note.
3. Confirm — creates one series row and a bounded set of Event rows.
4. No Missions are created automatically.

## Edit scopes

- **This occurrence** — changes only this Event; marked as modified.
- **This and future** — splits the series at this occurrence; past stays on the old series.
- **Entire series** — shifts other non-excepted occurrences; exceptions are preserved.

Always choose a scope. Confirm when Mission-linked Events would move.

## Cancel / restore

- **Cancel this occurrence** — cancels one Event; series continues; history kept.
- Restore returns a cancelled occurrence to HOLD when allowed.
- EXDATE exclusions stay out of active calendars but remain auditable.

## Series workspace

Open **View series** from an Event sheet → `/calendar/series/[id]` for rule, fingerprint, occurrences, and exceptions.
