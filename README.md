# Kelly Campaign Command Calendar (KCCC)

**Kelly’s daily campaign operating system** — intelligence layer before polished mobile UI.

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Current step | **5.5** — Operational intelligence (**PARTIAL**) |
| Blocking next | **Step 4 — Auth + RBAC** |
| Eventual next | Step 6 — Mobile Command Shell |
| Owned schema | `kelly_calendar` |
| Timezone | `America/Chicago` |

> Real candidate schedule data stays prohibited until authentication and mutation authorization are certified.

## What exists now

- Protected database foundation (`kelly_calendar`)
- Federated calendars + canonical events (schema)
- **Step 5.5 engines:** workflows, deterministic recommendations, readiness, timeline, conflicts, patterns, summaries
- Validation pages under `/system/step-5-5`, `/system/workflows`, `/system/readiness`, …

## Commands

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run workflow:validate
npm run step5.5:validate
npm run step5.5:all
```

Handoff: `develop_notes/KCCC_NEW_THREAD_HANDOFF.md`
