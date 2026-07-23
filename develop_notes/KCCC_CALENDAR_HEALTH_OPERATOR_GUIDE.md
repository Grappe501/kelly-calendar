# Calendar Health Operator Guide

**Dashboard:** `/system/calendar/health`  
**Detector:** `CC-11-HEALTH-1.0`

## When to use

Use health when you need a roll-up of import/integrity/job/ICS posture or a bounded forensic check — without changing the schedule.

## How to run

1. Open `/system/calendar/health`.
2. Review overall state and last run freshness.
3. Start a **manual** run (FULL or LIGHTWEIGHT) when needed.
4. Open **Runs** for domain progress, truncation, and errors.
5. Open **Findings** for evidence and related links (integrity finding, Event, etc.).
6. Open **Alerts** to acknowledge or suppress noise (with reason / until).

Page loads do **not** start runs unless you click start (or the scheduler fires).

## Alerts

| Action | Effect |
|--------|--------|
| Acknowledge | Noted; alert remains tracked |
| Suppress | Quiet until expiry; requires reason |
| Resolve / Stale | System or operator closes when evidence clears |

Alerts never merge, delete, cancel, or edit Events.

## What CC-11 will not do

- Auto-merge duplicates or auto-repair provenance
- Write `automaticallyResolved` on conflicts
- Rotate or revoke ICS subscription feeds
- Cancel stuck bulk operations or recover them
- Mutate Missions
- Replace the CC-02 integrity console (use integrity for dispositions)
