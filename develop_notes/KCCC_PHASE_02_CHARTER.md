# KCCC Phase 2 — Campaign Capability Expansion Charter

**Script ID:** `KCCC-PHASE-02-CAPABILITY-EXPANSION`  
**Status:** OPEN  
**Prerequisite:** Phase 1 CERTIFIED (Campaign Operating System Kernel)

## Kernel vs capability

**Phase 1 owns operational truth.**  
**Phase 2 owns operational experience.**

Phase 1 delivered the **Campaign Operating System Kernel** — operational truth domains every future capability consumes.

Phase 2 delivers **capabilities that orchestrate the kernel**. They do not recreate Field, County, Volunteer, Communications, Logistics, Finance, Compliance, Constituent, or Intelligence engines.

## Permanent Phase 2 principles

1. **Phase 2 capabilities orchestrate Phase 1 services — they do not replace or duplicate them.**

2. **Capabilities assemble operational context — they do not create parallel operational systems.**

3. **Capabilities own experiences and workflows, while operational systems own facts and state.**

   Example: Finance owns **resource state**. Fundraising owns the **workflow of building future resources**.

Corollaries:

1. New capabilities own almost no primary data.  
2. New canonical facts are introduced only when absolutely necessary for a decision Phase 1 cannot answer.  
3. Unknown remains first-class when a consumed domain cannot supply a fact.  
4. Readiness / preparedness equals the **minimum** of required domains (not an average).  
5. AI remains advisory and explainable; never overrides assembled operational truth.  
6. Gate for every capability: *What operational decision does this improve?*  
7. Assembled views improve automatically when kernel owners improve — no duplicate storage.

## Sequencing

| Increment | Question | Status |
|-----------|----------|--------|
| 2.1 Candidate Operations | Is the candidate prepared for today’s engagements? | ACCEPTED / COMPLETE |
| 2.2 Debate & Media Operations | Are we prepared for every public communication? | ACCEPTED / COMPLETE |
| 2.3 Fundraising Operations | Can the campaign sustainably generate the resources needed to execute the mission? | IN PROGRESS |
| 2.4 GOTV Operations | Are we converting support into turnout? | HELD |
| 2.5 Petition & Ballot Operations | Can we execute citizen-driven campaigns on the same OS? | HELD |

## Hard constraints (unchanged)

- No deletes / repo moves / template extraction  
- No RedDirt / AJAX / PhatLip / countyWorkbench / sos-public source imports  
- No real PII in tests; no secrets in docs/chat/commits  
- `candidate_data_ready` remains false until Steve unlocks real schedule data  
