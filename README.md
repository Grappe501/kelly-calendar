# Kelly Campaign Command Calendar (KCCC)

**Status:** Step 11 event create/edit **COMPLETE** · **Step 12** availability & standing rules **NEXT**

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\Kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Production | https://kelly-calendar.netlify.app |
| Active step | **12** Availability & Standing Rules |
| Canonical entity | **Prisma `Event` only** |
| Step 11 | `KCCC-EA-11-EVENT-CREATION-EDITING-1.0` |
| Candidate data | **Enabled for authorized roles** |
| Communications OS | **Frozen** |
| Roadmap | [`develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md`](develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md) |
| Event architecture | [`develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md`](develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md) |
| Operating views | [`develop_notes/KCCC_EA_10_CALENDAR_OPERATING_VIEWS.md`](develop_notes/KCCC_EA_10_CALENDAR_OPERATING_VIEWS.md) |
| Create / edit | [`develop_notes/KCCC_EA_11_EVENT_CREATION_EDITING.md`](develop_notes/KCCC_EA_11_EVENT_CREATION_EDITING.md) |

## Local validation

```powershell
cd H:\SOSWebsite\Kelly-calendar
npm run calendar:canonical:validate
npm run auth:validate
npm run governance:validate
npm run typecheck
```
