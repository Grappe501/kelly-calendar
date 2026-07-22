# CC-09 — Bulk Operations, Archive/Restore, and Recovery

```text
Build:         KCCC-CC-09-BULK-OPERATIONS-ARCHIVE-RESTORE-RECOVERY-1.0
Authorization: ADR-097
Standing:      ADR-094
Migration:     20260722160000_cc09_bulk_operations
Max batch:     50
```

## Mission

Safe multi-select calendar operations with server-authoritative preview, per-Event eligibility, idempotent execution, partial-failure reporting, and recovery for safe inverses.

## Actions enabled

| Action | Canonical service | Recovery |
|--------|-------------------|----------|
| ARCHIVE | `archiveEvent` | → RESTORE |
| RESTORE | `restoreEvent` | — |
| CANCEL | `cancelEvent` (reason required) | not simple undo |
| ADD_CALENDAR | `addEventCalendarMembership` | → REMOVE |
| REMOVE_CALENDAR | `removeEventCalendarMembership` (non-primary) | → ADD |

Tags are **not** enabled (no tag mutation service).

## Exclusions

Hard delete · bulk reschedule · bulk Mission mutation · bulk conflict disposition · external/Mobilize writes · CC-10 ICS · Phase Two

## Routes

- `/system/calendar/bulk`
- `/system/calendar/bulk/[operationId]`
- APIs under `/api/calendar/bulk…`
- Multi-select on Agenda, Day, Week

## Safety

1. Selection/preview create durable preview records only (no Event mutation).
2. Confirm binds `previewFingerprint`; archive/cancel require typed phrase.
3. Per-item fingerprint revalidated at execution; stale skipped.
4. Idempotency key prevents double apply.
5. Missions never auto-created/cancelled.
6. Series-wide scope always `REQUIRES_INDIVIDUAL_REVIEW`.

## Validator

`npm run calendar:bulk-operations:validate`

## Ship evidence

| | |
|--|--|
| Feature commit | `f8186be` |
| Netlify deploy | `6a612a7cba0c57774db91b5f` |
| Live URL | https://kelly-calendar.netlify.app |
| Migration | `20260722160000_cc09_bulk_operations` (db execute + migrate resolve; deploy blocked by prior failed google oauth migration) |
| Validator | `calendar:bulk-operations:validate` — 32 passed · unit 10 |
| CC-06/07/08 regressions | green |
| Typecheck / production build | green |
| Hard deletes / auto Missions / external writes / Phase Two | **0** |

CC-08 release preserved: tip `e1ddaa7` · tip deploy `6a612111e81d923c5e6c58ca` · feature `7486aa9` / `6a611dc19547e64f0fa7874d`.
