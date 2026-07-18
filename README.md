# Kelly Campaign Command Calendar (KCCC)

**Status:** Step 5.6 unlock complete · **Step 5.7 Netlify proof ACTIVE / BLOCKED** · Step 6 held

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Mutation unlock | `83c2bd4` |
| Active step | **5.7** Netlify auth + live mutation proof |
| Next after acceptance | Step 6 — Mobile Command Shell |
| Candidate data | **Disabled** |

## Local preflight

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run step5.7:local
```

## Operator Netlify actions (required)

1. `netlify login` and verify the **kelly-calendar** site (not RedDirt).
2. `npm run auth:secret:generate-production` — paste secret into Netlify only.
3. Set `APP_SESSION_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `ENV_FALLBACK_TO_REDDIRT=false`.
4. Record site ID/URL in `data/netlify_target.json`.
5. Deploy and run live proofs per `develop_notes/KCCC_STEP_05_7_DEPLOYMENT_RUNBOOK.md`.
6. Sign `develop_notes/KCCC_STEP_05_7_OPERATOR_ACCEPTANCE.md`.

Handoff: `develop_notes/KCCC_NEW_THREAD_HANDOFF.md`
