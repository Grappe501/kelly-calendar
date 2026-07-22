# KCCC Calendar Completion Program (CC-01…CC-12)

```text
Build ID:     KCCC-CALENDAR-COMPLETION-PROGRAM-1.0
Status:       LOCKED
Locked:       2026-07-21
Program baseline (lock): main @ 9c89012
CC-05 ship baseline:     main @ 46a72c3 · Netlify 6a60efa8f25804bc9b16f3f3
Source:       Burt discovery assessment (Option C)
Authority:    Steve acceptance of Burt defaults + sequencing adjustment
Assessment:   develop_notes/KCCC_CALENDAR_COMPLETION_ASSESSMENT_BURT_2026-07-21.md
Post-CC-05:   ADR-091 · develop_notes/KCCC_POST_CC05_USABILITY_PASS_DIRECTION.md
Phase Two:    ADR-093 · develop_notes/KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md
```

## Governing posture

```text
Primary track ............... Calendar Completion (CC-01…CC-12) — finish intact
Standing rule ............... Every pass must improve correctness, usability,
                              interoperability, or operational reliability
                              (ADR-088). No neutral refactors / unrelated expansion.
Unrelated campaign expansion  PAUSED
Communications OS (D20–D26) . FROZEN (unchanged)
LG-1 ........................ PAUSED (unchanged)
Mobilize credentials ........ NOT required for CC-01…CC-04, CC-07…CC-12
CC-01…CC-06 ................. COMPLETE (CC-05 via ADR-090; CC-06 via ADR-092)
CC-07…CC-12 ................. Remain LOCKED sequence — finish before Phase Two code
CC-07 ........................ DESIGN ONLY — unauthorized until separate Kelly authorization
Usability Synthesis 1 ....... EMPTY — still required for evidence
Phase Two (IC-01…IC-12) ..... VISION LOCKED (ADR-093) — design OK during CC-07…CC-12;
                              implement ONLY after CC-12 + usability/AI-quality gate + IC auth
Protected sequence .......... CC-07→08→09→10→11→12 → usability/AI-quality gate → IC auth
CC-07…CC-12 extension points  Allowed (query contracts, tokens, mobile-safe layouts,
                              provider-neutral interfaces, geographic identifiers)
CC-07…CC-12 hard stop ....... No hidden Phase Two features; no widened data collection
Next engineering build ....... NONE AUTHORIZED — waiting on separate CC-07 authorization
Authoritative tip ............ main @ 68d6476 (Kelly-confirmed posture)
Posture lock commit .......... 203bfe3 (protected sequence + extension boundary)
CC-05 ship evidence ......... main@46a72c3 · deploy 6a60efa8f25804bc9b16f3f3
CC-06 authorization ......... develop_notes/KCCC_CC_06_AUTHORIZATION_KELLY_2026-07-22.md
CC-06 ship evidence ......... develop_notes/KCCC_CC_06_CONFLICT_ENGINE.md
Phase Two vision ............ develop_notes/KCCC_PHASE_TWO_VISION_LOCK_KELLY_2026-07-22.md
```

This program finishes the **calendar product** (CC-01…CC-12) before Phase Two implementation. It does **not** reopen Architecture 1.0 ownership, does **not** authorize Communications production, does **not** treat ADR-090/092/093 as Usability Synthesis completion, does **not** authorize CC-07 engineering yet, and does **not** authorize IC-01…IC-12 coding before CC-12 plus the usability/AI-quality gate and separate IC authorization.
### Phase Two preview (post–CC-12)

Vision: an intelligent statewide campaign operating calendar — Mission meaning, geographic/strategic gaps, volunteers/travel coordination, mobile action — while remaining calendar-centered.

Binding AI principle: deterministic services establish facts, authorization, consent, coverage, conflicts, and permissible actions; AI understands and explains within confirmation boundaries.

Full program: `develop_notes/KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md` (IC-01…IC-12).

## Locked sequence (Option C)

| # | Deliverable | Size | Gate / notes |
|---|-------------|------|--------------|
| **CC-01** | Import Approval → Canonical Apply | L | **COMPLETE** |
| **CC-02** | Calendar Integrity & Provenance Console | L | **COMPLETE** — detector + console; no auto Event mutation |
| **CC-03** | Timezone, All-day & Overnight Hardening | M | **COMPLETE** — doctrine + temporal service; no schema migration |
| **CC-04** | Recurrence & Occurrence Exceptions | XL | **COMPLETE** — Model B series + materialized Events; `rrule` |
| **CC-05** | Standing Availability Inputs | L | **COMPLETE** — ship baseline `46a72c3` / `6a60efa8f25804bc9b16f3f3`; Synthesis remains EMPTY |
| **CC-06** | Conflict Engine | XL | **COMPLETE** — Kelly ADR-092 (2026-07-22); calendar slice validated; Synthesis remains EMPTY |
| **CC-07** | Unified Search, Filters & Saved Views | M | **DESIGN ONLY** — implement after separate authorization; Phase Two design may proceed in parallel docs only |
| **CC-08** | Advanced Day/Week Scheduling Workspace | L | Time grid first; drag-and-drop deferred |
| **CC-09** | Bulk Operations, Archive/Restore & Recovery | M | Parallel after core |
| **CC-10** | ICS Export & Subscription Privacy | M | After CC-01; private signed feeds |
| **CC-11** | Calendar Health Dashboard & Forensic Automation | M | Prefer after CC-02 |
| **CC-12** | Mobile, Print Day Sheets & Accessibility | M | Prefer after CC-07/CC-08; **gate before Phase Two IC implementation** |

## Sequencing adjustment (binding)

1. **Build CC-01 first.**  
2. Design CC-01 provenance and audit contracts so **CC-02 can reuse them**.  
3. **Do not combine** CC-01 and CC-02 into one deliverable. The import apply path must stay small enough to validate rigorously.

```text
CC-01 = approve / merge / reject → exactly one canonical Event path
CC-02 = integrity + provenance console over the whole Event graph
Shared = provenance records, audit action vocabulary, fingerprint language
```

## Adopted defaults (ADR-081–085)

| Decision | Locked default |
|----------|----------------|
| Import field precedence | Local edits win for **title, notes, status**; source timing wins **only** when an imported Event has **never** been manually rescheduled |
| ICS feeds | **Private and signed** — no public anonymous subscription URL |
| CC-08 interaction | Ship **time grid** before drag-and-drop |
| Feed locations | Redact exact **private/residential** locations (CITY or BUSY_ONLY) |
| Source-deleted Events | Remain as **`CANCELLED` history** with provenance |

## Decisive success test — CC-01

> Approve one staged import and create exactly one canonical Event; repeat the same import and create zero additional Events; merge and reject paths remain explicit and audited; no Mission or external calendar mutation occurs.

Full build brief: `develop_notes/KCCC_CC_01_IMPORT_APPROVAL_CANONICAL_APPLY.md`

## Dependency map

```mermaid
flowchart TD
  CC01[CC-01 Import Apply] --> CC02[CC-02 Integrity Console]
  CC01 --> CC10[CC-10 ICS Export]
  CC03[CC-03 Time Hardening] --> CC04[CC-04 Recurrence]
  CC03 --> CC08[CC-08 Scheduling Workspace]
  CC02 --> CC11[CC-11 Health Dashboard]
  Synth[Usability Synthesis / waiver] --> CC05[CC-05 Availability]
  CC05 --> CC06[CC-06 Conflict Engine]
  CC04 --> CC06
  CC07[CC-07 Search/Filters] --> CC08
  CC09[CC-09 Bulk/Recovery] --> CC11
  CC08 --> CC12[CC-12 Mobile/Print/A11y]
  CC07 --> CC12
```

## Out of scope until Calendar Completion exits

- Communications production enablement / D27+  
- Broad campaign ops expansion beyond Event↔Mission boundary already shipped  
- Google write-back / two-way sync  
- Treating Mobilize as a calendar sync dependency  
- Combining CC-01 with integrity console or Mission lifecycle work  

## Relationship to 25-step roadmap

CC items map onto Steps 11 polish / 12 / 13 / 22 / 23 / 24 without renumbering the frozen 25-step tracker. Runtime `CURRENT_STEP` for operator usability remains distinct from the Calendar Completion build pointer (`next_engineering_deliverable` / `calendar_completion_next`).

## Architecture 1.0 conformance

One canonical `Event`. Import apply writes Events only through the owned mutation stack. Missions are projections. External sources remain IMPORT_ONLY until a later, separately authorized sync program. Intelligence (CC-05/CC-06) never auto-mutates schedule without explicit approval.
