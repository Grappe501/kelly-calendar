# Historical Import Auth Protocol

| Operation | Route | Action |
| --- | --- | --- |
| Approve | `POST /api/imports/[importRunId]/records/[recordId]/approve` | `HISTORICAL_IMPORT_APPROVE` |
| Reject | `.../reject` | `HISTORICAL_IMPORT_REJECT` |
| Merge | `.../merge` | `HISTORICAL_IMPORT_MERGE` |

Staging/preview Google import routes also require session auth. Approve/merge is transactional, preserves external identities, separates historical attendance, is idempotent, and never auto-asserts “Kelly attended.”
