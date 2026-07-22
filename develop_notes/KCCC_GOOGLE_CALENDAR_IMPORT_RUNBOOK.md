# Google Calendar Import Runbook

**Floor:** `2025-11-01` America/Chicago (`KCCC_GOOGLE_HISTORY_START`)  
**Default:** dry-run · apply requires `KCCC_GOOGLE_SYNC_ENABLED=true` + confirm  

## Commands

```bash
npm run google:calendar:import-history
npm run google:calendar:import-history -- --apply
npm run google:calendar:sync
npm run google:calendar:sync -- --apply
npm run google:calendar:reconcile
```

Admin UI / API (authenticated owner/manager):

- `POST /api/integrations/google/calendar/import-history`
- `POST /api/integrations/google/calendar/sync`

## Staging

Imported Google records enter `UNREVIEWED` (`IMPORTED_UNREVIEWED` concept).  
Do not assume attendance from past dates.  
Do not auto-classify all events as campaign stops.

## CC-01 — Approve → canonical Event

```text
POST /api/imports/[importRunId]/records/[recordId]/approve
POST /api/imports/[importRunId]/records/[recordId]/reject
POST /api/imports/[importRunId]/records/[recordId]/merge   (body: { canonicalEventId })
UI:  /import/google-calendar/apply
Proof: npm run import:apply:proof
```

Invariants: one approve → one Event; re-approve unchanged fingerprint → zero Events; merge/reject audited; no Mission or Google write-back. Provenance snapshot schema is shared with CC-02 (`src/lib/calendar/import-provenance.ts`). Integrity console: `/system/calendar/integrity` (CC-02 — detection/disposition only).

## Reconciliation

```text
AUTO_MATCH_HIGH_CONFIDENCE
REVIEW_POSSIBLE_MATCH
NO_MATCH
SOURCE_CONFLICT
```

Private review artifacts (gitignored): `data/private/google-calendar-review/`

## Enrichment preservation

Google-owned source fields may update. KCCC-owned classification, outcomes, county, relationship notes, and approvals are never overwritten by sync.
