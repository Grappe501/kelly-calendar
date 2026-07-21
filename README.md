# Kelly Campaign Command Calendar (KCCC)

**Status:** Step 10 operating views **COMPLETE** · **Step 11** event creation & editing **NEXT**

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\Kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Production | https://kelly-calendar.netlify.app |
| Active step | **11** Event Creation & Editing |
| Canonical entity | **Prisma `Event` only** |
| Step 10 | `KCCC-EA-10-CALENDAR-OPERATING-VIEWS-1.0` |
| Candidate data | **Enabled for authorized roles** |
| Communications OS | **Frozen** |
| Roadmap | [`develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md`](develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md) |
| Event architecture | [`develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md`](develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md) |
| Operating views | [`develop_notes/KCCC_EA_10_CALENDAR_OPERATING_VIEWS.md`](develop_notes/KCCC_EA_10_CALENDAR_OPERATING_VIEWS.md) |

## Local validation

```powershell
cd H:\SOSWebsite\Kelly-calendar
npm run calendar:canonical:validate
npm run auth:validate
npm run governance:validate
npm run typecheck
```
