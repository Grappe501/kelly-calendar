# Calendar Integrity Operator Guide

**Console:** `/system/calendar/integrity`  
**Detector:** `CC-02-DETECTOR-1.0`

## When to use

Use the integrity console when you need to understand duplicates, missing provenance, stranded imports, source vs local drift, or overnight/recurrence warnings — without changing the schedule automatically.

## How to scan

1. Open `/system/calendar/integrity`.
2. Click **Scan last 120 days** (preferred) or **Scan full calendar (bounded)**.
3. Review findings by severity.
4. Open a finding for evidence and disposition.

Page loads do **not** start scans.

## Dispositions

| Disposition | Effect |
|-------------|--------|
| ACKNOWLEDGED | Noted; finding stays active |
| ACCEPTED_RISK | Requires reason; recorded risk acceptance |
| RESOLVED | Requires verified change or explicit operator judgment |
| NOT_APPLICABLE | Requires reason |

Dispositions never merge, delete, cancel, or edit Events.

## Provenance on Event sheet

Each Event sheet includes **Why this Event exists** (origin, fingerprint, import linkage, drift). It is read-only.

## What CC-02 will not do

- Auto-merge duplicates
- Auto-cancel or delete
- Fix overnight/all-day rendering (that is CC-03)
- Fix recurrence exceptions (that is CC-04)
- Mutate Missions
