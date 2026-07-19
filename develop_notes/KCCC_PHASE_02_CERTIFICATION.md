# KCCC Phase 2 Certification

**Product:** Kelly Campaign Command Calendar (KCCC)  
**Architecture:** Campaign Operating System  
**Certification:** PHASE 2 CERTIFIED  
**Status:** PRODUCTION READY  
**Version at certification:** `0.8.4-petition`  
**Tip at certification:** `fb69bad` (Phase 2.5 ship)  
**Certified:** 2026-07-19 (America/Chicago)

## Certified capabilities

| Capability | Route | Status |
|------------|-------|--------|
| Candidate Operations | `/candidate` | ACCEPTED |
| Debate & Media Operations | `/debate-media` | ACCEPTED |
| Fundraising Operations | `/fundraising` | ACCEPTED |
| GOTV Operations | `/gotv` | ACCEPTED |
| Petition & Ballot Operations | `/petition` | ACCEPTED |

## Permanent doctrine (locked)

1. Phase 2 capabilities orchestrate Phase 1 services — they do not replace or duplicate them.  
2. Capabilities assemble operational context — they do not create parallel operational systems.  
3. Capabilities own experiences and workflows; operational systems own facts and state.  
4. Capabilities coordinate execution across operational domains; they do not replicate those domains.  
5. Capabilities coordinate campaign strategy; operational systems provide execution truth.

Corollaries:

1. Every capability consumes canonical services.  
2. No capability duplicates ownership.  
3. Unknown remains explicit until its owning system exists.  
4. Readiness equals the **minimum** of required domains.  
5. AI remains advisory; never overrides assembled operational truth.  
6. Operational Intelligence may interpret — never override.

## Architecture layers (certified)

```text
Campaign Operating System

Layer 1 — Core Execution (Operational Truth) ..... Phase 1 CERTIFIED
Layer 2 — Campaign Capabilities (Orchestration) .. Phase 2 CERTIFIED
```

## What Phase 2 is

The first **campaign capability layer** — workflow and experience orchestration over the Phase 1 kernel. Capabilities answer campaign questions without becoming parallel systems of record.

## What Phase 2 is not

- A voter-file / signature warehouse  
- Election administration  
- A parallel CRM, finance ledger, or messaging platform  
- An automation or analytics platform (those are Phase 3 — Trusted Connected Platform themes)

## Next

Architecture Version **1.0** freezes Layers 1–2.  
Do **not** open Phase 2.6.  
Phase 3 is in **Architecture Review** under `KCCC_CONSTITUTION_v1.0.md` — implementation locked.
