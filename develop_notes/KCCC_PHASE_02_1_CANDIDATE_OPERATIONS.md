# KCCC Phase 2.1 — Candidate Operations

**Script ID:** `KCCC-PHASE-02.1-CANDIDATE-OPERATIONS`  
**Status:** IN PROGRESS  
**Parent:** Phase 2 Capability Expansion  
**Route:** `/candidate`  
**Version target:** `0.8.0-candidate`

## Doctrine

> Candidate Operations answers: **Is the candidate prepared for today’s engagements?**

Prepared ≠ scheduled. Preparation assembles travel, speaking notes, people, issues, media, risks, and decisions from the Phase 1 kernel.

## Ownership

**Owns (orchestration only):**

- Candidate Brief (Good Morning assembly)
- Engagement Brief packets (per stop)
- Candidate readiness domains + preparedness score (minimum of required domains)
- Candidate Inbox (candidate-specific items)
- Candidate Binder (printable / tablet assembly view)

**Does not own:** county health, logistics facts, compliance state, communications plans, relationship follow-ups, volunteer capacity, finance resource state, intelligence interpretations.

## Consume map

| Brief section | Canonical source |
|---------------|------------------|
| Today’s Schedule | Calendar / Campaign Brief |
| Travel | Logistics Operations |
| Speaking Notes | Communications Operations (content may be Unknown) |
| People You’ll Meet | Constituent presence counts (no PII) |
| Local Issues | Unknown until issue registry exists |
| Media | Communications (often Unknown) |
| Potential Risks | Executive + Field + Compliance + Logistics feeds |
| Required Decisions | Assembled from kernel alerts |
| Preparedness Score | Minimum of candidate readiness domains |

## Candidate readiness domains

Each: `READY` | `NEEDS_ATTENTION` | `BLOCKED` | `NOT_REQUIRED` | `UNKNOWN`

- Travel  
- Speech  
- Briefing  
- Media  
- Materials  
- Schedule  
- Security (Unknown — no Phase 1 security domain)  
- Personal (Unknown — no Phase 1 personal domain)

## Not a CRM / not a second Executive Command

Candidate Inbox is separate from Executive Inbox. Candidate Ops does not replace `/command`.
