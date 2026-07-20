# Google Calendar OAuth — Next Pass

**Date:** 2026-07-19  
**Priority:** Calendar history foundation (Routes paused)

## Snapshot

```text
Google OAuth .................. CONFIGURED
Database connection ........... CONFIGURED
Calendar connection ........... NOT_CONNECTED  ← browser Connect required
Routes enabled ................ NO
History start ................. 2025-11-01T00:00:00-05:00
Sync apply gate ............... OFF
CLI dry-run ................... wired (tsx → runGoogleCalendarImport, no DB writes)
```

## Operator sequence

### 1. Configure OAuth secrets (terminal only)

```powershell
cd H:\SOSWebsite\Kelly-calendar
npm run google:secrets:configure
```

Keep/replace each field. Ensure:

- `KCCC_GOOGLE_CLIENT_ID`
- `KCCC_GOOGLE_CLIENT_SECRET`
- `KCCC_GOOGLE_TOKEN_ENCRYPTION_KEY` (generate if needed)
- `KCCC_GOOGLE_OAUTH_REDIRECT_URI` (must match Cloud Console)
- Leave `KCCC_GOOGLE_ROUTES_ENABLED=false`
- Leave `KCCC_GOOGLE_SYNC_ENABLED=false` until dry review is approved

Also set the same OAuth secrets on Netlify (UI preferred).

### 2. Cloud Console

1. Enable **Google Calendar API**
2. OAuth consent + test user for Kelly
3. Web client redirect URIs matching local + production callback
4. Scope: `calendar.readonly` only

### 3. Connect

```powershell
npm run google:oauth:doctor
npm run google:oauth:connect
```

Or: `npm run dev` → sign in as Kelly/Campaign Manager → `/system/google-integration` → Connect.

### 4. Historical dry import

```powershell
npm run google:calendar:import-history
# from defaults to KCCC_GOOGLE_HISTORY_START (2025-11-01)
```

Review: duplicates, cancellations, private events, existing KCCC matches.

### 5. Apply only after approval

Enable sync gate explicitly, then apply via governed admin/API path (`KCCC_GOOGLE_SYNC_ENABLED=true` only when ready).

### 6. Enrichment (after import)

Use event locations → counties, organizations, contacts. No mileage dependency.
