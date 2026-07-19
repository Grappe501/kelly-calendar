# KCCC Step 7 — Campaign Operations Charter

**Script ID:** `KCCC-STEP-07-CAMPAIGN-OPERATIONS`  
**Status:** OPEN  

## Permanent principles

1. Every module consumes and produces across the ops graph.  
2. Every operational fact has exactly one canonical source.  
3. Unknown is a first-class operational state (not zero).  
4. Every operational artifact has one owner and many consumers.  
5. **Operational readiness equals the minimum readiness of all required operational domains** (not an average).  
6. **Every operational commitment has both an operational state and a resource state.**  
7. **Compliance is a readiness domain, not an after-the-fact audit.**  
8. **Operational Intelligence may interpret canonical facts, but it never replaces or overrides them.**  
9. **The Campaign Operating System exists to help people make better operational decisions. It is not a database, not a reporting engine, and not an automation platform. Data is collected only when it improves campaign execution.**

## Doctrine questions

| Module | Question |
|--------|----------|
| Executive Command | What does leadership need to know? |
| Operational Intelligence | What patterns, risks, and opportunities are emerging across the campaign? |
| Voter & Constituent Operations | Who are we serving, where are we building support, and what relationships require attention? |
| Communications Operations | Is everyone communicating the same campaign? |
| County Operations | Where are we weak? |
| Field Operations | Who needs help right now? |
| Volunteer Operations | Do we have enough people? |
| Logistics Operations | Can we actually execute today’s plan? |
| Finance & Resources Operations | Do we have the resources to sustain the campaign? |
| Compliance Operations | Can we do this legally, ethically, and according to campaign policy? |
| Calendar | What must happen and when? |

## Active increments

| Increment | Route | Status |
|-----------|-------|--------|
| 7.1 Executive Command | `/command` | SHIPPED |
| 7.2 Field Operations | `/field` | ACCEPTED |
| 7.3 County Operations | `/counties` | ACCEPTED |
| 7.4 Volunteer Operations | `/volunteers` | ACCEPTED |
| 7.5 Communications Operations | `/communications` | ACCEPTED |
| 7.6 Logistics Operations | `/logistics` | ACCEPTED |
| 7.7 Finance & Resources Operations | `/finance` | ACCEPTED |
| 7.8 Compliance Operations | `/compliance` | ACCEPTED |
| 7.9 Voter & Constituent Operations | `/constituents` | IN PROGRESS |
| 7.10 Operational Intelligence | `/intelligence` | ACCEPTED |

## Phase note

**Phase 1 (Core Campaign Execution + Intelligence) is COMPLETE.**  
Step 7.9 expands into campaign-specific relationship capabilities on that foundation.
