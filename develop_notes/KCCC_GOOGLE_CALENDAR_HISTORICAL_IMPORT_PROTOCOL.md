# Google Calendar Historical Import Protocol

**Floor:** `2025-11-01T00:00:00` America/Chicago  
**Mode:** Fetch → normalize → dedupe → stage → review  
**Database writes:** Disabled in Step 3

## Sources

1. **Public iCal** — HTTPS Google hosts only (`calendar.google.com`, etc.)
2. **Private secret iCal (env)** — `KCCC_GOOGLE_CALENDAR_ICAL_URL` only; import-only bootstrap/fallback (`KCCC_PRIVATE_ICAL_ENV_INTEGRATION.md`)
3. **Google Calendar API** — contract ready (`timeMin`/`timeMax`, `singleEvents`, pagination); OAuth required for production-grade archive (updates, cancellations, attendees, stable IDs)

## Staging

`data/ingest_staging/` on H-drive (gitignored contents).

## Operator UI

`/import/google-calendar` · review · history · `/system/imports`

## Future program (blocked)

Campaign movement history / memory graph: `KCCC-HISTORICAL-CAMPAIGN-MEMORY-1.0`  
(`KCCC_HISTORICAL_CAMPAIGN_MEMORY_1_0.md`) — vision captured; implementation not authorized under Feature Freeze.
