# Kelly Campaign Command Calendar (KCCC)

**Status:** Step 8 security closeout **COMPLETE** · **Step 9** canonical calendar data model **NEXT**

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\Kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Production | https://kelly-calendar.netlify.app |
| Active step | **9** Canonical Calendar Data Model |
| Step 8 closeout | `KCCC-EA-8-SECURITY-CLOSEOUT-1.0` |
| Candidate data | **Enabled for authorized roles** |
| Communications OS | **Frozen** (D20–D26 preserved; production blocked) |
| Roadmap | [`develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md`](develop_notes/KCCC_CALENDAR_25_STEP_MASTER_ROADMAP.md) |

## Local validation

```powershell
cd H:\SOSWebsite\Kelly-calendar
npm run auth:validate
npm run governance:validate
npm run typecheck
npm run build
```

## Notes

- Primary track is the campaign calendar (Today / Calendar / Event), not communications.
- Reuse Prisma `Event` as the single canonical event object in Step 9+.
