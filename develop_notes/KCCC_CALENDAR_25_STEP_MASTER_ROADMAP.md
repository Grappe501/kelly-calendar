# KCCC Calendar — 25-Step Master Roadmap

```text
Build: KCCC-CALENDAR-RECOVERY-RETURN-TO-CORE-1.0
Canonical tracker: THIS FILE (Steps 1–25)
Calendar Completion overlay: develop_notes/KCCC_CALENDAR_COMPLETION_PROGRAM.md (CC-01…CC-12 LOCKED)
Updated: ADR-093 Phase Two vision locked 2026-07-22 · CC-07…CC-12 intact first
Runtime: src/lib/system/constants.ts
```

## Governing decision

```text
Engineering Chapter 1: CLOSED
  (develop_notes/KCCC_ENGINEERING_CHAPTER_1_CLOSED.md)
Campaign OS Phase: EVIDENCE_ACQUISITION + Calendar Completion (CC-01…CC-12)
Primary engineering track: Calendar Completion (LOCKED) — finish CC-07…CC-12 intact
  Assessment: develop_notes/KCCC_CALENDAR_COMPLETION_ASSESSMENT_BURT_2026-07-21.md
  Program:    develop_notes/KCCC_CALENDAR_COMPLETION_PROGRAM.md
  Ship baseline: main @ 46a72c3 · Netlify 6a60efa8f25804bc9b16f3f3 (CC-01…CC-05)
  CC-06 Conflict Engine: COMPLETE (ADR-092)
  Next engineering: NONE AUTHORIZED — CC-07 remains DESIGN ONLY
  Usability Synthesis 1: remains EMPTY (not completed by ADR-090/092/093)
Phase Two (post–CC-12): VISION LOCKED (ADR-093)
  Program: develop_notes/KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md
  IC-01…IC-12 — design during CC-07…CC-12 OK; implement after CC-12 only
  AI principle: deterministic facts/auth/consent/coverage/conflicts; AI explains/recommends
Unrelated campaign expansion: PAUSED
Campaign OS Baseline: 1.0 FROZEN (immutable — do not rewrite after observation)
  (develop_notes/KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md)
Next baseline: 1.1 from observation evidence (version-defining, not bug fixes)
Primary product: Kelly Campaign Calendar → Campaign Operating System (calendar as center)
Canonical schedule entity: Prisma Event ONLY
Communications OS (D20–D26): FROZEN
LG-1: PAUSED
AI: disabled until Step 16 (proposal_only)
Calendar Foundation v1: BUILD COMPLETE (Steps 8–11)
CC-05 / Step 12 calendar slice: COMPLETE (ADR-090 waiver; Synthesis still EMPTY)
CC-06 / Step 13 calendar slice: COMPLETE (ADR-092) — never auto-mutate schedule; remaining EA-13 types design only
CC-01…CC-04, CC-07…CC-12: may proceed independent of Mobilize credentials
Cadence: Build → validate → observe → synthesize → refine → next phase
  (see develop_notes/KCCC_OPERATOR_OBSERVATION_CADENCE.md)
Layers: Operational (operator defines reality) vs Intelligence (system interprets)
  Doctrine #1: develop_notes/KCCC_CAMPAIGN_OS_DOCTRINE_1.md
  (see also develop_notes/KCCC_OPERATIONAL_VS_INTELLIGENCE_LAYERS.md)
Schedule mutations: detect / explain / recommend / simulate — never without explicit approval
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
| **⏸** | **Operator Usability Pass 1** | **OPEN** — Synthesis still EMPTY · ADR-091 |
| | Synthesis (after sessions) | `KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md` — **EMPTY** (not completed by ADR-092) |
| **12 / CC-05** | **Availability & Standing Rules** | **✅ COMPLETE** (ADR-090) |
| **13 / CC-06** | **Conflict Engine** | **✅ COMPLETE** (ADR-092) · calendar slice shipped · never auto-mutate |

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

## Next authorized pass

```text
CC-06 Conflict Engine (ADR-092) — COMPLETE
NEXT ENGINEERING — NONE AUTHORIZED
CC-07…CC-12 remain the locked Calendar Completion sequence (finish intact)
CC-07 design only: develop_notes/KCCC_CC_07_UNIFIED_SEARCH_FILTERS_SAVED_VIEWS_DESIGN.md
Usability Synthesis 1 remains EMPTY (ADR-091)
Phase Two (IC-01…IC-12) VISION LOCKED (ADR-093) — design during CC-07…CC-12 OK;
  implement ONLY after CC-12
  develop_notes/KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md
```

CC-05 and CC-06 are shipped. No further engineering build is authorized yet.
Do **not** implement CC-07 or any IC-* build. Do **not** mark Synthesis complete
because Phase Two was locked. Do **not** destabilize the calendar with premature
Phase Two coding.
