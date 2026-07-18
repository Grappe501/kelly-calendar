# Google Calendar Historical Import Protocol

**Floor:** `2025-11-01T00:00:00` America/Chicago  
**Mode:** Fetch → normalize → dedupe → stage → review  
**Database writes:** Disabled in Step 3

## Sources

1. **Public iCal** — HTTPS Google hosts only (`calendar.google.com`, etc.)
2. **Google Calendar API** — contract ready (`timeMin`/`timeMax`, `singleEvents`, pagination); OAuth in Step 4

## Staging

`data/ingest_staging/` on H-drive (gitignored contents).

## Operator UI

`/import/google-calendar` · review · history · `/system/imports`
