# Calendar Major Dedupe — 2026-07-21

**Command:** `npm run events:dedupe:major`  
**Analysis:** `npm run events:analyze:duplicates`  
**Proof:** `develop_notes/database_proofs/calendar-dedupe-major-latest.json`

## Result

| Metric | Value |
|--------|-------|
| Active before | 71 |
| Cancelled | 6 |
| Active after | 65 |

## Cancelled (kept sibling)

| Cancelled | Kept | Reason |
|-----------|------|--------|
| KCCC-2026-0038 | KCCC-2026-0160 | River Valley rally (pass3 vs later confirmed ingest) |
| KCCC-2026-0032 | KCCC-2026-0048 | Travel to El Dorado (duplicate travel rows) |
| KCCC-2026-0026 | KCCC-2026-0040 | HSV overnight lodging (Deb Bryan / host) |
| KCCC-2026-0028 | KCCC-2026-0039 | HSV Democrats speaking / Road to Blue |
| KCCC-2026-0001 | — | Synthetic mutation proof (seed) |
| KCCC-2026-0002 | — | Synthetic mutation proof (seed) |

## Intentionally kept overlapping (not dupes)

- HSV remote work day ∩ Road to Blue dinner (work + evening mission)
- Cave City Christy volunteering ∩ Kelly festival field mission (different roles)

## Policy

Dedupe **cancels** duplicates; does not delete. Re-run analysis after future multi-pass ingests.
