# KCCC Phase 2.3 — Fundraising Operations

**Script ID:** `KCCC-PHASE-02.3-FUNDRAISING-OPERATIONS`  
**Status:** IN PROGRESS  
**Parent:** Phase 2 Capability Expansion  
**Route:** `/fundraising`  
**Version target:** `0.8.2-fundraising`

## Doctrine

> Fundraising Operations answers: **Can the campaign sustainably generate the resources needed to execute the mission?**

Distinct from Finance & Resources (Phase 1): **Do we have the resources to sustain the campaign?**

- Finance owns **resource state** (cash Unknown, budgets Unknown, approvals Unknown, dual-state readiness).  
- Fundraising owns the **workflow of building future resources**.

## Owns (capability / workflow)

- Fundraising event preparation  
- Prospect pipeline stages (Unknown until pipeline ledger)  
- Ask opportunities (Unknown until ask registry)  
- Follow-up plans (Unknown until stewardship ledger)  
- Event readiness  
- Stewardship activities (Unknown until surface)  
- Campaign fundraising goals (Unknown until goals registry)  
- Prospect engagement cadence (Unknown until cadence store)

## Does not own

- cash balances  
- operational budgets  
- reimbursements  
- finance approvals  

Those remain in Finance & Resources.

## Feeds

| Consumer | Consumes |
|----------|----------|
| Candidate | today’s fundraising brief, donor meetings, event objectives, prep status |
| Communications | fundraising messaging, invitation readiness, event collateral status |
| Executive | Fundraising Readiness, Upcoming Events, Critical Follow-ups, Pipeline Health, Near-term Opportunities, Campaign Funding Outlook |
| Intelligence | pipeline trends, follow-up delays, event effectiveness, engagement patterns (interpret only) |

## Principle

> Capabilities own experiences and workflows, while operational systems own facts and state.
