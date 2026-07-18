# Step 5.7 Deployment Runbook

## 0. Preconditions

- Tip contains `83c2bd4` (mutation unlock) and current governance tip
- Local: `npm run step5.6:all` green
- Separate Netlify site for `Grappe501/kelly-calendar` (not RedDirt)

## 1. Generate production secret (operator machine)

```powershell
Set-Location H:\SOSWebsite\kelly-calendar
node scripts/generate-production-session-secret.mjs
```

Copy the value from the written operator-secrets file into Netlify UI. Do not paste into chat, git, or docs.

## 2. Netlify environment (runtime scopes)

Set at least:

- `APP_SESSION_SECRET` (runtime — all server/functions contexts)
- `DATABASE_URL`
- `DIRECT_URL`
- `ENV_FALLBACK_TO_REDDIRT=false`
- `NEXT_PUBLIC_APP_URL` (production URL)
- Optional proof window only: `KCCC_DEPLOYMENT_PROOF_MODE=true` (disable after acceptance)

Do **not** enable automatic `auth:seed` in production.

## 3. Record site identity

Update `data/netlify_target.json`:

- siteName, siteId, productionUrl
- status → `verified`

## 4. Deploy

Deploy `main` tip that includes `83c2bd4` (current tip OK if no Step 6 work).

## 5. Proof sequence

Follow `KCCC_STEP_05_7_NETLIFY_AUTH_AND_LIVE_MUTATION_PROOF.md` outcomes 4–12 and the operator acceptance checklist.

## 6. After acceptance

- Disable proof mode / restrict staging users
- Archive or isolate proof calendar
- Record acceptance
- Promote `next_step` to Step 6 only then
