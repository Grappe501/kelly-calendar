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
