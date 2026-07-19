# Calendar Experience — Day View

**Script ID:** `KCCC-CAL-EXP-1-DAY-VIEW`  
**Track:** Engineering Track A · Calendar Experience  
**Status:** SHIPPED — `/calendar` Day View  

**Architecture:** 1.0  

## Executive question

> **What am I doing today?**

## Displays (Pass 1)

| Surface | Source | Notes |
|---------|--------|-------|
| Today's schedule | Canonical events via safe projections | Filtered to selected Chicago date |
| Today's missions | Mission cards | Same ownership as Today shell |
| Travel | Mission timeline / travel context | Leave-by when present |
| Reminders | Standing availability policy | Not DB events |
| Campaign brief | Link to `/brief` | No duplicate brief ownership |
| Readiness | Today readiness rollup | Minimum-of-domains doctrine preserved |
| Conflicts | Overlap detection (OI) | Explicit; non-autonomous |
| Weather | Placeholder | Future integration · Advisory Only |

## Non-goals

- No ownership changes  
- No Google Calendar dual-master  
- No AI inventing schedule facts  
- No Week/Month grids in this slice (scaffolded as next)  
