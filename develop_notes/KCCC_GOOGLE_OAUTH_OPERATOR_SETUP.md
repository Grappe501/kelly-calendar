# Google OAuth Operator Setup

**Initiative:** `KCCC-GOOGLE-CALENDAR-OAUTH-AND-ROUTES-1.0`  
**Scope:** `calendar.readonly` only · no write-back  

## Local secrets

```bash
npm run google:secrets:configure
```

Writes gitignored `.env.local` only. Never paste secrets into Cursor chat.

## Production (preferred)

Netlify → Site configuration → Environment variables. Set blank keys from `.env.example` with real values.

## Optional CLI push

```bash
npm run google:secrets:push-netlify
```

Requires Netlify CLI auth + explicit confirmation phrase. Values are not printed.

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
