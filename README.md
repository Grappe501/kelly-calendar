# Kelly Campaign Command Calendar (KCCC)

**Status:** Step 11 **COMPLETE** · **Operator Usability Pass OPEN** · Step 12 **blocked**

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\Kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Production | https://kelly-calendar.netlify.app |
| Active gate | **Operator Usability Pass 1** |
| Canonical entity | **Prisma `Event` only** |
| Step 11 | `KCCC-EA-11-EVENT-CREATION-EDITING-1.0` |
| Step 12 | **Not authorized** until usability pass reviewed |
| Candidate data | **Enabled for authorized roles** |
| Communications OS | **Frozen** |
| Roadmap | [`develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md`](develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md) |
| Usability pass | [`develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md`](develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md) |
| Synthesis | [`develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md`](develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md) |
| Observation cadence | [`develop_notes/KCCC_OPERATOR_OBSERVATION_CADENCE.md`](develop_notes/KCCC_OPERATOR_OBSERVATION_CADENCE.md) |
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
