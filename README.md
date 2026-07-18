# Kelly Campaign Command Calendar (KCCC)

**Kelly’s daily campaign operating system** — auth + intelligence before polished mobile UI.

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Current step | **4** — AUTH-RBAC (**COMPLETE**) |
| Still partial | Steps 5 + 5.5 live mutation wiring |
| Next UI | Step 6 — Mobile Command Shell (not started) |
| Owned schema | `kelly_calendar` |
| Timezone | `America/Chicago` |

> Real candidate schedule PII stays prohibited until `candidate_data_ready` is certified.

## Auth (Step 4)

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run auth:ensure-secret
npm run db:migration:apply   # after KCCC_ALLOW_SCHEMA_MIGRATION=1
npm run auth:seed
npm run auth:validate
npm run step4:validate
```

Sign in at `/login` with seeded `@example.invalid` accounts.

## Commands

```powershell
npm run step4:all
npm run step5.5:validate
```

Handoff: `develop_notes/KCCC_NEW_THREAD_HANDOFF.md`
