# KCCC Calendar — 25-Step Master Roadmap

```text
Build: KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0
Canonical tracker: THIS FILE
Updated: Calendar Foundation v1 BUILD COMPLETE → Operator Observation OPEN (Step 12 blocked)
Runtime: src/lib/system/constants.ts
```

## Governing decision

```text
Primary product: Kelly Campaign Calendar → Campaign Operating System (calendar as center)
Canonical schedule entity: Prisma Event ONLY
Communications OS (D20–D26): FROZEN
LG-1: PAUSED
AI: disabled until Step 16 (proposal_only)
Calendar Foundation v1: BUILD COMPLETE (Steps 8–11)
Step 12: NOT AUTHORIZED until operator observation + evidence synthesis reviewed
Cadence: Build → validate → observe → synthesize → refine → next phase
  (see develop_notes/KCCC_OPERATOR_OBSERVATION_CADENCE.md)
Layers: Operational (operator defines reality) vs Intelligence (system interprets)
  Doctrine #1: develop_notes/KCCC_CAMPAIGN_OS_DOCTRINE_1.md
  (see also develop_notes/KCCC_OPERATIONAL_VS_INTELLIGENCE_LAYERS.md)
Schedule mutations: detect / explain / recommend / simulate — never without explicit approval
Further doctrine: HOLD until observation + synthesis complete
Review return: evidence patterns, not bug lists
```

---

## Phase 1 — Calendar Foundation v1

```text
✅ Steps 8–11 shipped — build complete
⏸ Operator Observation Pass 1
⏸ Synthesis (evidence → interpretation → Step 12 decision)
⬜ Step 12+ (shaped by observation, not assumptions)
```

| Step | Name | Status |
|------|------|--------|
| 1–7 | Environment, scaffold, auth foundation, schema, shell, entry APIs | ✅ / 🔄 foundation |
| **8** | **Security + Candidate Data Certification** | **✅ COMPLETE** |
| **9** | **Canonical Calendar Data Model** | **✅ COMPLETE** |
| **10** | **Calendar Operating Views** | **✅ COMPLETE** |
| **11** | **Event Creation & Editing** | **✅ COMPLETE** |
| **⏸** | **Operator Usability Pass 1** | **OPEN** — `KCCC_OPERATOR_USABILITY_PASS_1.md` |
| | Synthesis (after sessions) | `KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md` — empty until sessions done |
| **12** | **Availability & Standing Rules** | **⬜ BLOCKED** until synthesis reviewed |
| **13** | **Conflict Engine** | **📐 DESIGN READY** · first **Intelligence Layer** slice · **⬜ IMPLEMENTATION BLOCKED** until Step 12 — `KCCC_EA_13_CONFLICT_ENGINE_ARCHITECTURE.md` |

---

## Phase 2 — Campaign Operations

| Step | Name | Status |
|------|------|--------|
| 14 | Mission Lifecycle | ⬜ |
| 15 | Relationship Integration | ⬜ |
| 16 | AI Assistance | ⬜ |
| 17 | Travel Planning | ⬜ |
| 18 | Briefing System | ⬜ |
| 19 | Debrief / Follow-up | ⬜ |
| 20 | Tasks & Delegation | ⬜ |
| 21 | Volunteer Scheduling | ⬜ |

---

## Phase 3 — Ecosystem

| Step | Name | Status |
|------|------|--------|
| 22 | Calendar Import / Export | ⬜ |
| 23 | Google Sync | ⬜ |
| 24 | Hardening / Mobile | ⬜ |
| 25 | Launch Certification | ⬜ |

---

## Canonical Event rule (locked in Step 9)

```text
Event  (one table of record)
 ├── Participants
 ├── Mission          ← projection; NOT an Event
 ├── Travel
 ├── Briefing
 ├── Follow-up
 ├── Tasks
 ├── AI Summary
 ├── Visibility
 └── Audit
```

Architecture: `develop_notes/KCCC_EA_9_CANONICAL_CALENDAR_DATA_MODEL.md`  
Operating views: `develop_notes/KCCC_EA_10_CALENDAR_OPERATING_VIEWS.md`  
Create/edit: `develop_notes/KCCC_EA_11_EVENT_CREATION_EDITING.md`  
Code lock: `src/lib/calendar/canonical-event.ts`  
Validate: `npm run calendar:canonical:validate`

## Next authorized build

```text
HOLD — complete Operator Usability Pass 1 + Synthesis 1
develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md
develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md
Standing cadence: develop_notes/KCCC_OPERATOR_OBSERVATION_CADENCE.md
```

Step 12 (`KCCC-EA-12-AVAILABILITY-STANDING-RULES-1.0`) is **not authorized** until the pass is synthesized and reviewed with Steve.
Do not start automatically. Do not change the Pass 1 protocol further — run it.

Step 13 (`KCCC-EA-13-CONFLICT-ENGINE-1.0`) **depends on Step 12**. Architecture may be matured now (`KCCC_EA_13_CONFLICT_ENGINE_ARCHITECTURE.md`); **implementation is not authorized** until Step 12 availability is an input to conflict detection. Do not skip to Step 13 build.
