# Operator Week Ingest — 2026-07-19 → 2026-07-26

**Status:** ACTIVE  
**Scope:** **(2) Enable live ingest** — canonical Events · **no** drill-down UI · **no** AI  
**Feature Freeze:** HONORED  
**Timezone:** America/Chicago  

## Honesty rule

- **CONFIRMED** = operator gave a clock time (or clear overnight lodging).  
- **TENTATIVE** = planning window only (after-work depart, late return, Saturday morning parade, Sunday night forum, picnic *end*).  
- No street addresses in git. No invented readiness/attendance/opponent claims.

## Schedule (safe titles)

| When | Calendar | Title | Status |
|------|----------|-------|--------|
| Sun Jul 19 · 17:00–19:00 | Fundraising | Fundraiser for Dr. Chris Jones — US CD-2 | CONFIRMED |
| Mon Jul 20 · 08:00–10:00 | Protected Personal | Internet service install window | CONFIRMED |
| Mon Jul 20 · 08:30–11:00 | Protected Personal | Property walk / farm clean-up (Don Henry) | CONFIRMED |
| Mon Jul 20 · 17:30–19:00 | Public Events | Kelly speaks — England Democrat Meeting | CONFIRMED (end planning) |
| Mon Jul 20 · 18:00–19:30 | Public Events | Steve speaks — Jonesboro NAACP | CONFIRMED (end planning) |
| Mon Jul 20 · 20:00–21:00 | Travel | Meet at farm — Carroll prep | CONFIRMED |
| Tue Jul 21 · 16:30–20:00 | Public Events | Carroll County Democrats Picnic | CONFIRMED start; end placeholder |
| Tue Jul 21 · 21:00–23:30 | Travel | Return to farm (late) | TENTATIVE |
| Wed Jul 22 · 17:00–20:00 | Travel | LR → Hot Springs Village after work | TENTATIVE |
| Wed Jul 22 night | Protected Personal | HSV lodging (Democrats) | CONFIRMED |
| Thu Jul 23 · day | Staff Work | Kelly work from Hot Springs Village | CONFIRMED (day block) |
| Thu Jul 23 night | Protected Personal | Farm overnight | CONFIRMED |
| Thu Jul 23 · 22:00 → Fri | Protected Personal | Steve fasting starts | CONFIRMED |
| Fri Jul 24 · 07:30 | Protected Personal | Steve procedure + ultrasound | CONFIRMED (end Unknown) |
| Sat Jul 25 · morning | Public Events (+ Volunteer) | Cave City Watermelon Festival & Parade | TENTATIVE window |
| Sat Jul 25 night | Protected Personal | Batesville lodging | CONFIRMED |
| Sun Jul 26 · morning | Public Events | Blytheville church visits | TENTATIVE window |
| Sun Jul 26 · night | Public Events | Blytheville candidate forum | TENTATIVE window |

## Still Unknown (do not invent)

- Exact picnic end Tuesday  
- Exact “late” return Tuesday  
- Exact Wednesday depart after Kelly’s work  
- Exact Cave City parade start  
- Exact Blytheville church / forum clock times  
- Medical facility address  

## Commands

```bash
npm run events:ingest:operator-week
```

Proof: `develop_notes/database_proofs/operator-week-ingest-latest.json`  
Calendar: `/calendar?view=week&date=2026-07-19` (login required)

## Deferred under Feature Freeze

| Item | Tracker |
|------|---------|
| Mission drill-down | HL-005 · HL-039 |
| AI pattern recognition | XR-8 · V2 Authorization |
