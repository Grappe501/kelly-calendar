# KCCC Step 3 — Test Report

**Date:** 2026-07-18

## Visibility unit tests

| Suite | Path |
| --- | --- |
| Visibility resolution | `tests/unit/calendar-security/visibility-resolution.test.ts` |
| Location disclosure | `tests/unit/calendar-security/location-disclosure.test.ts` |
| Event title policy | `tests/unit/calendar-security/event-title-policy.test.ts` |
| Event sanitization | `tests/unit/calendar-security/event-sanitization.test.ts` |

Covered assertions:

- Limited viewers see calendar name, safe title, generalized location, start/end
- Protected fields omitted from JSON
- Sensitive titles replaced
- Exact locations generalized to city
- Protected personal → BUSY_ONLY
- Events remain visible as occupied time

## Existing Step 3 suites retained

Environment, redaction, security helpers, capabilities, availability policy, navigation, timezone, election.

## E2E

`tests/e2e/shell.spec.ts` — includes `/system/visibility` and `/api/system/visibility`.

## Commands

```powershell
npm run visibility:test
npm run test
npm run test:e2e
npm run step3:all
```

## Results (this pass)

| Command | Result |
| --- | --- |
| `npm run visibility:test` | PASS — 17 tests |
| `npm run test` | PASS — 34 tests |
| `npm run test:e2e` | PASS — 3 tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm run security:bundle` | PASS |
| `npm run db:diagnose` | PASS — connection ok, no mutation |
| `npm run step3:validate` | PASS |
