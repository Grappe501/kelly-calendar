# Calendar Experience — Week View

**Script ID:** `KCCC-CAL-EXP-2-WEEK-VIEW`  
**Track:** Engineering Track A · Calendar Experience  
**Status:** SHIPPED — `/calendar?view=week`  
**Architecture:** 1.0  

## Executive question

> **What does the campaign need to accomplish this week?**

## Acceptance

| Criterion | Status |
|-----------|--------|
| Seven-day operational calendar | ✓ |
| Mission readiness strip | ✓ (Unknown until week-scoped domain rollups exist; links to owners) |
| Weekly mission rail | ✓ (derived from mission cards) |
| Travel summary | ✓ (from logistics/travel snaps; partial → Unknown) |
| County activity summary | ✓ (from mission geo; County Ops remains owner) |
| Candidate schedule | ✓ (classification helpers + calendar type) |
| Volunteer summary | ✓ (staffing signals; Volunteer Ops remains owner) |
| Weekly campaign brief | ✓ (schedule signals + link to full brief) |
| Standing reminders | ✓ |
| No new canonical ownership | ✓ |
| Consumes Architecture 1.0 services only | ✓ |

## Navigation model

`Day | Week | Month | Agenda | Timeline | Mission` — Week and Day ready; others next.

## Next

Month View (Pass A.3) before Agenda/Timeline.
