# CC-03 Rollback Companion

## Safe rollback (preferred)

1. Redeploy the prior Netlify production build (application version only).
2. Do **not** rewrite Event `startsAt` / `endsAt` / `timezone` / `isAllDay`.
3. Preserve CC-01 provenance and CC-02 integrity findings/audits.

CC-03 added **no Prisma migration**. Schema rollback is unnecessary.

## Disable editor controls without data change

- Revert Event sheet UI to prior single-date timed editor.
- Stored instants remain valid; views may again omit overnight/multi-day until membership code is restored.

## Query / membership revert

Restore start-day-only filters in:

- `eventsOnChicagoDate`
- week/month day bucketing
- agenda dateKey derivation

This reintroduces known overnight omission bugs — only for emergency UX rollback.

## What must not happen

- No mass UPDATE of production Event times without authorized preview + rollback plan
- No deletion of Events or Missions
- No destructive DB rollback automation

## Non-lossless note

If a future pass **does** migrate temporal fields, document exact reversal; CC-03 itself does not transform legacy times.
