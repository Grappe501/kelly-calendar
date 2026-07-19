# KCCC Constitution v1.0

**Product:** Kelly Campaign Command Calendar (KCCC)  
**Architecture:** Campaign Operating System  
**Architecture Version:** 1.0  
**Status:** FROZEN through Phase 2  
**Project State:** Architecture Review (implementation locked)  
**Effective:** 2026-07-19 (America/Chicago)  
**Authority:** Highest-level architectural document in this repository. All future features, integrations, and automations must obey this Constitution.

---

## 1. Purpose

The Campaign Operating System exists to help people make better **operational decisions** — not to be a database, reporting engine, CRM, automation platform, or AI decision-maker.

Data is collected only when it improves campaign execution.

---

## 2. Architecture Layers

```text
LAYER 1 — Operational Kernel (Phase 1 · CERTIFIED · FROZEN)
Executive · Field · County · Volunteer · Communications ·
Logistics · Finance · Compliance · Constituent · Operational Intelligence

↓

LAYER 2 — Campaign Capabilities (Phase 2 · CERTIFIED · FROZEN)
Candidate · Debate & Media · Fundraising · GOTV · Petition & Ballot

↓

LAYER 3 — Trusted Connected Platform (Phase 3 · Architecture Review)
Trusted Integrations · Human-Gated Automation ·
Executive Analytics · Campaign Platform
```

No new architectural layer may be introduced until Phase 3 is fully designed and accepted.

---

## 3. Canonical Ownership

Every operational fact has **exactly one** canonical owner.

| Layer | Owns | Does not own |
|-------|------|--------------|
| Layer 1 | Facts and operational state | Campaign-specific experience UI as primary truth |
| Layer 2 | Workflows and experiences | Parallel systems of record |
| Layer 3 | Trust, connectivity, governance, scale | Kernel or capability ownership |

Consumers may read and assemble. They may not redefine ownership.

---

## 4. Operational Truth

**Phase 1 owns operational truth.**

- The kernel is the system of record for execution state.  
- Operational Intelligence may interpret canonical facts; it never replaces or overrides them.  
- External systems may supply information; they never become authoritative for campaign operational truth.

---

## 5. Capability Orchestration

**Phase 2 owns campaign strategy orchestration.**

1. Capabilities orchestrate Phase 1 services — they do not replace or duplicate them.  
2. Capabilities assemble operational context — they do not create parallel operational systems.  
3. Capabilities own experiences and workflows; operational systems own facts and state.  
4. Capabilities coordinate execution across domains; they do not replicate those domains.  
5. Capabilities coordinate campaign strategy; operational systems provide execution truth.

Every capability answers **one** executive question.

---

## 6. Unknown Doctrine

Unknown is a **first-class operational state**.

- Unknown is not zero, false, empty, or “probably fine.”  
- Unknown remains explicit until its owning system exists.  
- Inventing values to hide Unknown is an architectural violation.

---

## 7. Readiness Model

Operational readiness equals the **minimum** of required domains — not an average, not a weighted score that conceals a blocked domain.

No inferred readiness. Domains that are not required may be `NOT_REQUIRED`; domains that are required and unknown remain Unknown.

---

## 8. Integration Doctrine

> **No external integration may become the canonical owner of campaign operational truth.**

- The Phase 1 kernel is the integration point.  
- Externals are sources of information — not owners of campaign truth.  
- Conflicting or unavailable external data must surface as Unknown or explicit conflict — not silent overwrite.

See Phase 3 charter: `KCCC_PHASE_03_CHARTER.md`.

---

## 9. Automation Doctrine

- Automations consume canonical state; they do not bypass ownership.  
- Campaign-facing and risk-bearing actions follow: **Approve → Execute**.  
- Never: automatically execute against canonical state without the approved gate.  
- No hidden automation.

---

## 10. AI Doctrine

- AI is **advisory only**.  
- No AI writes to canonical operational state.  
- AI never overrides assembled operational truth.  
- Advisory output must remain attributable (`application: "kelly-calendar"`).  
- `ai_enabled` remains false until explicitly unlocked.

---

## 11. Executive Questions

Each certified module/capability answers one standing question:

| Module / Capability | Executive question |
|---------------------|--------------------|
| Executive Command | What does Kelly need to know in 60 seconds? |
| Field | Where is execution heat / help needed? |
| County | Where are we weak? |
| Volunteer | Do we have enough people to execute the plan? |
| Communications | Is everyone communicating the same campaign? |
| Logistics | Are materials / travel / venues ready? |
| Finance | What is resource state vs commitment? |
| Compliance | Are we filing-ready and disclaimer-safe? |
| Constituent | Who are we serving / relating to? |
| Intelligence | What patterns emerge — without overriding owners? |
| Candidate | Is the candidate prepared for today’s engagements? |
| Debate & Media | Are we prepared for every public communication? |
| Fundraising | Can we sustainably generate resources to execute? |
| GOTV | Are we converting support into turnout? |
| Petition & Ballot | Can we qualify, defend, and execute a petition/ballot campaign? |

Phase 3 pillars (definition only) carry their own questions — see Phase 3 charter.

---

## 12. Architectural Prohibitions

```text
No duplicate ownership.
No parallel databases.
No hidden automation.
No AI writes to canonical state.
No external system becomes authoritative.
No inferred readiness.
Unknown is valid.
Operational Intelligence cannot override operational truth.
Approve → Execute.
Every capability answers one executive question.
Every operational fact has exactly one owner.
No Phase 2.6 capability expansion while Architecture Review is active.
No Phase 3 implementation until design review is accepted.
No new architectural layer until Phase 3 is fully designed.
```

Hard lane constraints (unchanged):

- No deletes / repo moves / template extraction as “cleanup”  
- No RedDirt / AJAX / PhatLip / countyWorkbench / sos-public source imports without an approved integration packet  
- No real PII in tests; no secrets in docs/chat/commits  

Maturity flags remain false until unlocked:

```text
candidate_data_ready ............ false
real_candidate_data_enabled ..... false
ai_enabled ...................... false
```

---

## 13. Certification Process

Future work advances only through these levels:

```text
LEVEL A — Architecture Review
LEVEL B — Engineering Complete
LEVEL C — Production Validation
LEVEL D — Operator Acceptance
LEVEL E — Certified
```

Phase 1 and Phase 2 have reached **Level E (Certified)**.  
Architecture Version 1.0 freezes Layers 1–2.  
Phase 3 is at **Level A (Architecture Review)**; implementation is **locked**.

---

## 14. Version History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-19 | Constitution established. Architecture frozen through Phase 2. Project placed in Architecture Review. Phase 3 Trusted Connected Platform definition only; implementation locked. |

---

## Related documents

- Phase 1 certification: `KCCC_PHASE_01_CERTIFICATION.md`  
- Phase 2 certification: `KCCC_PHASE_02_CERTIFICATION.md`  
- Phase 3 charter: `KCCC_PHASE_03_CHARTER.md`  
- Thread handoff: `KCCC_NEW_THREAD_HANDOFF.md`  
