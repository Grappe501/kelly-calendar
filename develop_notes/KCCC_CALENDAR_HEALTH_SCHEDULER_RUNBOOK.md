# Calendar Health Scheduler Runbook (CC-11)

## Purpose

Bounded scheduled health checks via secret-authenticated internal ingress. Observe/explain only — no Event/Mission mutation.

## Ingress

| Item | Value |
|------|--------|
| Route | `POST /api/internal/calendar/health/scheduled` |
| Auth | Header `x-kccc-calendar-health-secret` (shared secret) |
| Public-path | Allowlisted under `/api/internal/calendar/health/` because secret authenticates — not anonymous |

## Operator schedule UI

`/system/calendar/health/schedule` — expected cadence, last checkpoint, consecutive failures (read-oriented).

## Lease & freshness

- Exclusive lease (~60s) prevents overlapping runs
- Lightweight freshness: 30 minutes
- Full freshness: 24 hours
- Soft wall-clock per run: ~55s; truncation reported honestly

## Failure handling

1. Confirm secret configured in Netlify / local env (never commit secrets).
2. Check last `CalendarHealthRun` status and `errorSummaryRedacted`.
3. Check `CalendarHealthCheckpoint.consecutiveFailures` and `nextExpectedAt`.
4. Run a manual FULL or LIGHTWEIGHT check from the dashboard to isolate scheduler vs detector issues.
5. Do **not** “fix” by mutating Events, rotating feeds, or writing conflict auto-resolve.

## Rollback / disable

Rotate or remove the scheduler secret and/or remove the public-path allowlist entry so scheduled ingress stops. Preserve health history tables.
