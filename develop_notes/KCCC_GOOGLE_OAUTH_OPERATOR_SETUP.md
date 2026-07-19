# Google OAuth Operator Setup

**Initiative:** `KCCC-GOOGLE-CALENDAR-OAUTH-AND-ROUTES-1.0`  
**Scope:** `calendar.readonly` only · no write-back  

## Current priority (2026-07-19)

```text
1. Finish Google Calendar OAuth (client + secret + encryption + redirect)
2. Connect Kelly calendar with calendar.readonly
3. Historical dry import from 2025-11-01
4. Review duplicates / cancellations / private / existing KCCC matches
5. Apply approved import
6. Geographic + relationship enrichment from event locations
```

**Routes / mileage:** paused — `KCCC_GOOGLE_ROUTES_ENABLED=false`. Implementation retained. See `KCCC_GOOGLE_ROUTES_MILEAGE_RUNBOOK.md`.

## Local secrets

```bash
npm run google:secrets:configure
```

Writes gitignored `.env.local` only. Never paste secrets into Cursor chat.

### Add Routes API Key Through Terminal

When you already have OAuth configured and only need the Routes key:

```bash
cd H:\SOSWebsite\Kelly-calendar
npm run google:secrets:configure -- --routes-only
```

1. At the hidden prompt, paste the Google Routes API key and press Enter (nothing is echoed).
2. Answer whether to set `KCCC_GOOGLE_ROUTES_ENABLED=true` locally (`y/N`).
3. Confirm:

```bash
npm run campaign:routes:doctor
```

Expected presence-only lines:

```text
Routes API key configured .... YES
Routes integration enabled ... YES / NO
Routes API reachable ......... PASS / FAIL / SKIPPED
Browser exposure ............. NOT DETECTED
```

Do **not** paste the key into Cursor chat, Git, or markdown.

Optional live reachability (still never prints the key):

```bash
# PowerShell
$env:KCCC_ROUTES_DOCTOR_PING='true'
npm run campaign:routes:doctor
```

Doctor ping uses a fixed latLng Little Rock → Conway `DRIVE` body. Classify failures before rotating keys:

- `REQUEST_OR_ARGUMENT` → fix request (not the key)
- `CREDENTIAL_OR_PERMISSION` / `CREDENTIAL_KEY_EXPLICIT` → then consider key/ACL repair

See `KCCC_GOOGLE_ROUTES_MILEAGE_RUNBOOK.md` for current production state.

## Production (preferred)

Netlify → Site configuration → Environment variables. Set blank keys from `.env.example` with real values.

For Routes only, set:

- `KCCC_GOOGLE_MAPS_ROUTES_API_KEY`
- `KCCC_GOOGLE_ROUTES_ENABLED`

## Optional CLI push

```bash
npm run google:secrets:push-netlify
npm run google:secrets:push-netlify -- --routes-only
```

On this environment, Netlify CLI `env:set` places values in process arguments (shell history / process list). The script **refuses unsafe automated push** and instructs you to enter values in the Netlify UI. Prefer safety over automation.

## Connect

1. `npm run dev`
2. Sign in as Kelly or Campaign Manager
3. Open `/system/google-integration` → Connect
4. Approve read-only Calendar access

Redirect URI must match Cloud Console and `KCCC_GOOGLE_OAUTH_REDIRECT_URI` exactly.

## Cloud Console checklist

1. Enable **Google Calendar API** and **Routes API**
2. OAuth consent + test user `kelly@kellygrappe.com`
3. Web client + redirect URIs
4. Routes API key restricted to Routes API
5. Billing alert for Routes

## Doctor

```bash
npm run google:oauth:doctor
npm run google:calendar:status
```
