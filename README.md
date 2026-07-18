# Kelly Campaign Command Calendar (KCCC)

**Kelly’s daily campaign operating system** — authenticated mutations unlocked; Netlify live proof next; then mobile shell.

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Tip | `83c2bd4` |
| Completed | Steps 1–4 + **5.6 authenticated ops unlock** |
| Partial | Steps 5 + 5.5 |
| Immediate next | **Step 5.7** — Netlify auth + live mutation proof |
| After 5.7 | Step 6 — Mobile Command Shell |
| Owned schema | `kelly_calendar` |
| Candidate data | **Disabled** |

## Auth + mutations (local)

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run auth:ensure-secret
npm run auth:seed
npm run step5.6:validate
npm run step5.6:all
```

Sign in at `/login`. Validation surfaces: `/system/step-5-6`, `/system/auth-debug`, `/system/mutation-test`, `/system/permissions`, `/system/audit`.

## Step 5.7 gate (operator)

Deploy tip `83c2bd4` only after setting production `APP_SESSION_SECRET` (32+ chars) in Netlify. Prove 401/403/409 and synthetic authenticated mutations. Keep `candidate_data_ready: false`. See `develop_notes/KCCC_STEP_05_7_NETLIFY_AUTH_AND_LIVE_MUTATION_PROOF.md`.

Handoff: `develop_notes/KCCC_NEW_THREAD_HANDOFF.md`
