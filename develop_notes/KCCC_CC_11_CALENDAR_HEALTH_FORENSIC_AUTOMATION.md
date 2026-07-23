# CC-11 — Calendar Health Dashboard & Forensic Automation

```text
Build:         KCCC-CC-11-CALENDAR-HEALTH-FORENSIC-AUTOMATION-1.0
Authorization: ADR-099
Standing:      ADR-094
Migration:     20260723100000_cc11_calendar_health
Detector:      CC-11-HEALTH-1.0
```

## Mission

Give operators a trustworthy roll-up of calendar health — import/integrity trends, stuck jobs, ICS feed posture, conflict anomalies, and bounded forensic domain checks — without repairing or rewriting the schedule.

## Doctrine

- Observe and explain only
- Bounded runs (soft caps: events examined, findings, wall-clock, exclusive lease)
- Never mutate Events, Missions, recurrence, availability, or conflict auto-disposition
- Never rotate/revoke ICS feeds (monitor feeds; CC-10 owns lifecycle)
- Honest PARTIAL / UNKNOWN / NOT_CONFIGURED when incomplete or misconfigured
- HEALTHY only when all mandatory domains succeed without critical findings or truncation

## Models

| Model | Role |
|-------|------|
| `CalendarHealthRun` | Run lease, domain progress, overall state, truncation |
| `CalendarHealthFinding` | Per-domain finding with stable key + evidence fingerprint |
| `CalendarHealthAlert` | Coalesced alert (ack / suppress / resolve / stale) |
| `CalendarHealthCheckpoint` | Scheduler continuity / consecutive failures |

## Domains

Full: events, imports, integrity, time, recurrence, availability, conflicts, search, scheduling, bulk, ics, jobs.  
Lightweight mandatory subset: events, imports, integrity, jobs, ics.

## Routes

| Kind | Path |
|------|------|
| UI | `/system/calendar/health` |
| UI | `/system/calendar/health/runs` · `/runs/[runId]` |
| UI | `/system/calendar/health/findings` · `/findings/[findingId]` |
| UI | `/system/calendar/health/alerts` |
| UI | `/system/calendar/health/schedule` |
| API | `/api/calendar/health` · `/runs` · `/findings` · `/alerts` · `/export` · `/schedule` |
| Internal (secret) | `/api/internal/calendar/health/scheduled` |

Session APIs require auth. Internal scheduled path is on the public-path allowlist **only** because `x-kccc-calendar-health-secret` authenticates the request — not anonymity.

## Relationship to CC-02

CC-02 integrity console remains the disposition surface for integrity findings. CC-11 may reuse detectors and surface trends; it does not replace CC-02 and does not auto-repair.

## Validator

`npm run calendar:health:validate`

## Ship evidence

| | |
|--|--|
| Migration | `20260723100000_cc11_calendar_health` |
| Authorization | ADR-099 |
| Status | COMPLETE |
| Feature commit | `d570dc6` |
| Netlify deploy | `6a61aa30fc4c865f2bd3c628` |
| Hard Event/Mission mutation / feed rotate / auto-resolve | **0** |
