# Calendar Bulk Operations Doctrine (CC-09)

- Selection never mutates.
- Preview never mutates Events (may persist operation/preview rows).
- Server recomputes eligibility and fingerprints.
- One action per operation.
- Partial failure is honest.
- Recovery only for documented inverses.
- Recurrence: occurrence ≠ series; never infer series from multi-select.
- Mission lifecycle independent of Event archive/cancel/restore.
- Import: local only; no remote write.
- Conflicts: post-mutation recompute only; never `automaticallyResolved=true` via bulk.
