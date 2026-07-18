# Kelly Campaign Command Calendar (KCCC)

**Kelly’s daily campaign operating system** — authenticated mutations unlocked; mobile shell next.

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Completed | Steps 1–4 + **5.6 authenticated ops unlock** |
| Partial | Steps 5 + 5.5 (schema/engines exist; broader ops still evolving) |
| Next | Step 6 — Mobile Command Shell |
| Owned schema | `kelly_calendar` |
| Candidate data | **Disabled** |

## Auth + mutations

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run auth:ensure-secret
npm run auth:seed
npm run step5.6:validate
npm run step5.6:all
```

Sign in at `/login`. Validation surfaces: `/system/step-5-6`, `/system/auth-debug`, `/system/mutation-test`, `/system/permissions`, `/system/audit`.

Netlify must set `APP_SESSION_SECRET` (32+ chars) before production deploy.

Handoff: `develop_notes/KCCC_NEW_THREAD_HANDOFF.md`
