# Standing Availability & Campaign Office Hours Policy

**Status:** Operator-accepted baseline rhythm (Evidence Acquisition)  
**Code:** `src/lib/campaign/availability-policy.ts`  
**Calendar listing:** **Not listed** — office hours are background busy blocks only  
**Retire script:** `npm run events:ingest:standing-office-hours` (cancels any leftover listed office Events)

## Assumptions (calendar always starts here)

1. **Monday–Friday 8:00 AM–12:00 PM** — Campaign Office Hours (**Busy / blocked**)  
   Title (policy only): *Kelly Grappe – Secretary of State Campaign Office Hours*
2. **Monday–Friday 12:00 PM–1:00 PM** — **Open** (lunch / flexible meetings) — not auto-blocked  
3. **Monday–Friday 1:00 PM–5:00 PM** — Campaign Office Hours (**Busy / blocked**) — same title  
4. **Every Tuesday** — default location **Little Rock Campaign Office** (same hours + open lunch), unless superseded  
5. **Last Tuesday of each month** — Little Rock office day **shifts to Monday**; Tuesday is available for statewide field / county immersion (Mon evening departure → multi-day immersion → return before remaining week commitments)

## Display & counting rule (operator decision 2026-07-21)

- Do **not** list daily office hours as calendar Events.
- Do **not** include them in day/week/month event counts, workload counts, or mission lists.
- Time remains **blocked** as standing availability (missions override).
- Operating views exclude rows matching `Campaign Office Hours` / `standing-office-*` ingest keys.

## Event override rule

Campaign events, travel, festivals, rallies, county immersions, debates, speaking engagements, or major meetings **override** standing office blocks for overlapping windows.

Examples: Jefferson immersion Aug 12–13; NWA immersion Aug 17–20; Greene immersion Aug 25–26 (with Mon Aug 24 as LR office under the last-Tuesday exception).

## Doctrine

Operator defines reality (including standing rhythm and mission overrides).  
System interprets for guidance — does not silently clear missions to restore office hours.

## Step 12 note

Full `AvailabilityRule` engine remains gated. Until then, policy encodes busy windows; listed Event materialization for office hours is **retired**.
