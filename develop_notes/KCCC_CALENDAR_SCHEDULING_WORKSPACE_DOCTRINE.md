# KCCC Calendar Scheduling Workspace Doctrine (CC-08)

```text
Authority: CC-03 temporal · CC-04 occurrence identity · CC-05 availability · CC-06 conflicts · CC-07 query
Layout:    Pure deterministic grid model — never persists positions
Mutation:  Canonical Event services only; no drag/resize in CC-08
```

## Principles

1. **Campaign-local time** — layout uses Chicago day windows and CC-03 membership; never UTC date slicing for columns.
2. **One Event identity** — multi-day/overnight Events render as segments/continuations, not duplicated Event records.
3. **Half-open intervals** — touching ends do not overlap; exclusive all-day end date is not occupied.
4. **Overlap ≠ conflict** — side-by-side layout is visual; CC-06 records drive conflict badges/disposition.
5. **Availability is overlay** — CC-05 classifications may paint context; never become Events; never auto-move Events.
6. **Query is singular** — CC-07 owns search/filter/saved views; layout prefs are compatible keys only.
7. **Intentional create/edit** — slot select opens preview; confirmation creates via canonical path; drag/resize forbidden.
8. **Privacy** — visibility applied before layout; no confidential leakage via empty geometry or counts.
9. **Agenda remains** — accessible alternative list view is retained.
10. **Lifecycle isolation** — viewing/layout creates zero operational mutations.

## Preference storage

Prefer URL + saved-view layout keys. Do not fabricate preferences on read. Do not store sensitive filters in unprotected localStorage.
