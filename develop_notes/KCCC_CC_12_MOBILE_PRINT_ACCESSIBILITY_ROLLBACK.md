# CC-12 Rollback — Mobile / Print / Accessibility

```text
Build: KCCC-CC-12-MOBILE-PRINT-ACCESSIBILITY-1.0
ADR:   ADR-100
```

## What can be rolled back

CC-12 adds **no migration** and no `CalendarPrint*` tables. Rollback is code/docs only.

1. Revert the CC-12 ship commit(s) on `main` (or redeploy the prior Netlify deploy id).
2. Confirm `CC_12_STATUS` returns to `NOT_AUTHORIZED` only if intentionally re-gating; otherwise leave `COMPLETE` and disable routes via revert.
3. Print routes under `/system/calendar/print/**` disappear with the revert — no data cleanup required.
4. Mobile CSS (`mobile-week-day-selector`, print sheet rules) and `MobileAgendaFallbackLink` revert with the same commit.

## What must not be “rolled back”

- Do not invent a destructive migration
- Do not mutate Events/Missions to “undo” print
- Do not revoke ICS feeds or alter CC-11 health tables as part of CC-12 rollback
- Do not flip Phase Two to authorized

## Verification after rollback

- `npm run calendar:mobile-print-a11y:validate` may fail (expected if files removed)
- Prior validators (ICS / bulk / search / health) should still pass with Phase Two locked
- Live `/system/calendar/print/preview` returns 404 or prior behavior
