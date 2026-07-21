# Standing Availability & Campaign Office Hours Policy

**Status:** Operator-accepted baseline rhythm (Evidence Acquisition)  
**Code:** `src/lib/campaign/availability-policy.ts`  
**Materialization:** `npm run events:ingest:standing-office-hours`

## Assumptions (calendar always starts here)

1. **Monday–Friday 8:00 AM–12:00 PM** — Campaign Office Hours (**Busy**)  
   Title: *Kelly Grappe – Secretary of State Campaign Office Hours*
2. **Monday–Friday 12:00 PM–1:00 PM** — **Open** (lunch / flexible meetings) — not auto-blocked  
3. **Monday–Friday 1:00 PM–5:00 PM** — Campaign Office Hours (**Busy**) — same title  
4. **Every Tuesday** — default location **Little Rock Campaign Office** (same hours + open lunch), unless superseded  

## Event override rule

Campaign events, travel, festivals, rallies, county immersions, debates, speaking engagements, or major meetings **override** standing office blocks for overlapping windows.

Examples: Jefferson immersion Aug 12–13; NWA immersion Aug 17–20; Miller immersion Aug 23–24.

## Doctrine

Operator defines reality (including standing rhythm and mission overrides).  
System interprets for guidance — does not silently clear missions to restore office hours.

## Step 12 note

Full `AvailabilityRule` engine remains gated. Materialized `Event` rows are the interim operational representation.
