# KCCC Live Calendar Ingest — Pass 2

**Pass:** `PASS2-2026-07-19`  
**Scope:** Confirmed July 19–24 commitments only  
**Feature Freeze:** HONORED · no drill-down · no AI · no new routes/schemas  

## Authority

Sunday night Blytheville → Monday events → return farm Monday evening → Kelly works Little Rock Tuesday.  
**Carroll County travel/picnic and prior Pass-1 Wed–Sun itinerary are superseded (CANCELLED), not deleted.**

## Live (published)

| Key | When | Calendar |
|-----|------|----------|
| fundraiser-cd2-2026-07-19 | Sun Jul 19 17:00–19:00 | Fundraising |
| overnight-blytheville-2026-07-19 | Sun 19:00 → Mon 08:00 | Travel |
| isp-window-2026-07-20 | Mon 08:00–10:00 | Protected Personal |
| property-walk-2026-07-20 | Mon 08:30–11:00 | Protected Personal |
| england-dems-kelly-2026-07-20 | Mon 17:30 (end UNKNOWN) | Public Events |
| kelly-work-littlerock-2026-07-21 | Tue all-day busy | Protected Personal |
| cave-city-christy-low-2026-07-24 | Fri all-day (shift UNKNOWN) | Volunteer |

## Staged (not live — Unknown times)

- `draft_pass2_naacp_steve_jonesboro` — start/end/venue UNKNOWN  
- `draft_pass2_return_farm_after_england` — depart/arrive UNKNOWN  

## Conflicts (surfaced, not resolved)

- Internet 8:00–10:00 ∩ Don Henry 8:30–11:00  
- Blytheville overnight ends 8:00 AM vs farm internet at 8:00 AM  

## July boundary note

Operator-entered July campaign schedule is currently complete through the known events in this pass. Absence of records does not prove universal availability.

## Command

```bash
npm run events:ingest:operator-week
```

Idempotent. Re-run twice to verify. Farm street address is operator-known; **not** written into git-tracked docs/proofs.
