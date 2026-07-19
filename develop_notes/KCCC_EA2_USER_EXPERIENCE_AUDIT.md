# EA-2 User Experience Audit — Operator Cognition

**Script ID:** `KCCC-EA-2-USER-EXPERIENCE`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md`  
**Status:** ACTIVE / OPENED  
**Nature:** Operator cognition + workflow — **complements EA-4** (looks) with **how operators think and work**  
**Prerequisite:** EA-1 PASS WITH FINDINGS · EA-4 PASS · Proceed APPROVED  
**Implementation:** Audit only — no feature adds · no Redesign coding  

```text
EA-4 asks: How does it look and feel?
EA-2 asks: How does an operator think and decide?
```

---

## Mission

Verify that Calendar Experience V1 supports **confident, fast operator cognition** across Day, Week, and Month — without inventing truth or absorbing domain ownership.

---

## Cognition questions (must answer)

| # | Question | Status |
|---|----------|--------|
| Q1 | Can a first-time operator identify today’s priorities within **10 seconds**? | OPEN |
| Q2 | Is navigation predictable across Day / Week / Month? | OPEN |
| Q3 | Which controls are never used? | OPEN |
| Q4 | Where do users hesitate? | OPEN |
| Q5 | Which labels are unclear? | OPEN |
| Q6 | What information do users repeatedly search for? | OPEN |
| Q7 | Does the interface encourage **confidence** or **uncertainty**? | OPEN |

---

## Method

1. First-time campaign-manager walkthrough (Day → Week → Month → back).  
2. Timed “priorities in 10s” probe on Day View cold load.  
3. Control inventory vs likely use.  
4. Hesitation / search / label clarity map.  
5. Confidence vs uncertainty scoring (Unknown wall, `% ready`, partial catalogue).  
6. Feed findings into `KCCC_HARDENING_MASTER_LEDGER.md`.

---

## Preliminary evidence (code walk — not closed)

Seeded from V1 surfaces; full scoring pending walkthrough close.

| Observation | Cognition impact | Likely phase |
|-------------|------------------|--------------|
| No persistent “What Matters Now?” (EA-4) | Fails 10s priority test | Redesign XR-01 |
| Week `N% ready of loaded missions` | Looks authoritative; may inflate confidence wrongly | Hardening HL-002 |
| Six Unknown domain tiles + reasons | Correct doctrine; high uncertainty load | Redesign HL-003 |
| View chips + date nav shared | Predictable zoom (likely Q2 pass) | Protect |
| Agenda / Timeline / Mission chips disabled | May cause hesitation (“why can’t I?”) | V2 / Foundation |
| Brief / Command buttons present | Confidence for authority path | Protect |
| MissionDayActions on Day when mutable | May feel like calendar manages missions | Hardening HL-005 |
| County/candidate → hubs | Extra search for specific entity | Hardening HL-008 |

---

## Relationship to other streams

| Stream | Boundary |
|--------|----------|
| EA-4 | Visual system, emotion, brand — already PASS |
| EA-1 | Ownership / derive / Unknown doctrine — PASS WITH FINDINGS |
| EA-3 | Information architecture / page purpose (next after EA-2) |
| EA-9 | Operator workflow depth (may overlap; EA-2 stays cognition-first) |

---

## Deliverables (on close)

```text
Operator Cognition Findings
        ↓
Hesitation & Label Map
        ↓
Ledger rows (HL-*)
        ↓
EA-2 Assessment (Pass / Pass with Findings / Fail)
```

## Exit criteria (draft)

```text
✓ Q1–Q7 answered with evidence
✓ Findings classified (cognition vs visual vs architecture)
✓ No invented truth recommended as UX fix
✓ Ledger updated
✓ Complements EA-4; does not reopen Architecture 1.0
```

## Architecture 1.0 Conformance Statement

EA-2 does not amend Architecture 1.0. UX recommendations that would invent domain truth are **out of scope** — redesign presentation and navigation only.
