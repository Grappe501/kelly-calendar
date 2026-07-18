# Kelly Campaign Command Calendar (KCCC)

**Status:** Step 5.7 complete · **Step 6 Mobile Command Shell IN PROGRESS**

| Field | Value |
|-------|-------|
| Path | `H:\SOSWebsite\kelly-calendar\` |
| GitHub | [github.com/Grappe501/kelly-calendar](https://github.com/Grappe501/kelly-calendar) |
| Production | https://kelly-calendar.netlify.app |
| Active step | **6** Mobile Command Shell |
| Closure tip (5.7) | `fc13413` |
| Candidate data | **Disabled** |

## Local validation

```powershell
cd H:\SOSWebsite\kelly-calendar
npm run step6:validate
npm run typecheck
npm run test
```

## Notes

- Auth, DB (`kelly_calendar` schema), safe projections, and audit are proven in Step 5.7.
- Step 6 ships mobile command surfaces in increments; do not reopen Step 5.7 wiring.
