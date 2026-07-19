# KCCC Live Ingest Pass 3

**Pass:** `PASS3-2026-07-19`  
**Range:** July 22 – September 13, 2026  
**Feature Freeze:** HONORED · no drill-down · no AI · no schema  

## Status mapping

| Concept | DB enum |
|---------|---------|
| Confirmed | `CONFIRMED` |
| Tentative | `TENTATIVE` |
| Informational / pending approval | `HOLD` |
| Staged unknown | Draft JSON only |
| Superseded | `CANCELLED` |

## Commands

```bash
npm run events:ingest:operator-pass3
npm run events:data-quality:operator-pass3
```

Optional opaque Google Calendar URL env (do not invent event fields from them):

```bash
KCCC_PASS3_GCAL_URL_1=...
KCCC_PASS3_GCAL_URL_2=...
```

## Idempotency (recorded)

| Run | Created | Updated | Restored (conceptual HSV) | Staged | Duplicates |
|-----|---------|---------|---------------------------|--------|------------|
| First | 14 | 0 | 0* | 1 | 0 |
| Second | 0 | 14 | 0* | 1 | 0 |
| Third (restore linkage) | 0 | 14 | 3 | 1 | 0 |

\* First/second runs created distinct Pass-3 HSV keys while Pass-1 HSV keys remained `CANCELLED`. Third run annotated superseded Pass-1 keys.

## Live event numbers

| Key | Event # | Status |
|-----|---------|--------|
| travel-hsv-2026-07-22 | KCCC-2026-0025 | TENTATIVE |
| lodging-hsv-deb-bryan-2026-07-22 | KCCC-2026-0026 | CONFIRMED |
| kelly-work-hsv-remote-2026-07-23 | KCCC-2026-0027 | CONFIRMED |
| hsv-democrats-kelly-2026-07-23 | KCCC-2026-0028 | CONFIRMED |
| fundraiser-bramlett-2026-08-02 | KCCC-2026-0029 | CONFIRMED |
| faulkner-dem-fundraiser-2026-08-02 | KCCC-2026-0030 | HOLD |
| kelly-erin-2026-08-04 | KCCC-2026-0031 | CONFIRMED |
| travel-eldorado-2026-08-04 | KCCC-2026-0032 | CONFIRMED |
| wf-eldorado-immersion-2026-08-05 | KCCC-2026-0033 | CONFIRMED |
| retired-ministers-eldorado-2026-08-05 | KCCC-2026-0034 | CONFIRMED |
| travel-russellville-2026-08-05 | KCCC-2026-0035 | TENTATIVE |
| travel-hope-2026-08-07 | KCCC-2026-0036 | TENTATIVE |
| black-caucus-gbm-2026-08-08 | KCCC-2026-0037 | HOLD |
| river-valley-choice-rally-2026-09-13 | KCCC-2026-0038 | CONFIRMED |

## Privacy

Meet dial-in/PIN → `privateNotes` only.  
Host residential addresses → not in public fields.  
Opaque GCal template URLs → staged/source metadata only.

## Key conflict

Jim Bob Bramlett fundraiser (CONFIRMED 4–7pm) ∩ Faulkner County fundraiser (HOLD 5–7:30pm) on Aug 2 — not auto-resolved.

## Source index

`develop_notes/source_references/river-valley-has-a-choice-press-release.md`
