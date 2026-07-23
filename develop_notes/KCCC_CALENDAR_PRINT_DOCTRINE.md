# KCCC Calendar — Print Doctrine

```text
Program: CC-12 (ADR-100)
Migration: NONE — projection only
```

## Binding rules

1. Print is a **read-only projection** of Events the actor may already view.
2. Never emit `streetAddress`, private notes, feed tokens, or contacts on any profile.
3. Profiles: `DAY_OPERATIONS_REDACTED`, `INTERNAL_DAY_DETAIL`, `WEEK_OVERVIEW`.
4. Residential venue names fall back to city-only even on internal detail.
5. Status must appear as **visible text** on sheets (not color-only).
6. Confidentiality footer on every sheet.
7. No `CalendarPrint*` persistence tables — prefer no migration.
8. Print routes require campaign session auth (not public-paths).

## Audit

Print views may write attributed audit of the form “viewed print projection” without mutating Events.
