# EA-9 Operator Workflow Audit

**Script ID:** `KCCC-EA-9-OPERATOR-WORKFLOW`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md` · `KCCC_AUDIT_CONSTITUTION.md`  
**Status:** COMPLETE  
**Assessment:** **PASS WITH FINDINGS**  
**Nature:** Evidence-only · **no behavior changes**  
**Feature Freeze:** ACTIVE  
**Complements:** EA-2 (decision-making / cognition) — EA-9 measures **workflow continuity**, not page scorecards  
**Governing question:**

> Can an operator consistently complete campaign work with confidence, minimal friction, and without violating the platform's governance model?

**Evidence date:** 2026-07-19  

---

## Executive Verdict

```text
EA-9 Operator Workflow

Status .................... PASS WITH FINDINGS

Governance Compliance ..... PASS

Architecture .............. PRESERVED

Feature Freeze ............ HONORED

Behavior Changes .......... NONE

Workflow Strategy ......... HARDENING + FOUNDATION

Primary gap ............... Dead mission deep-links (?event= ignored)

Governance posture ........ STRONG (ownership · Unknown · non-autonomous conflicts)
```

Operators can **orient and scan** Day/Week/Month with honest Unknown handling, but **task progression into mission work is broken** at the primary action link. That is a Foundation continuity gap — not an Architecture 1.0 failure.

---

## Operator Workflow Profile

| Workflow | Status | Primary friction |
|----------|--------|------------------|
| Scan today | Partial | Readiness useful; corrective “next” may dead-end (OW-001) |
| Open mission / act | **Blocked** | `/calendar?event=` not consumed (OW-001) |
| Coordinate week | Partial | Grid/rail identify work; no mission-level entry (OW-002) |
| Strategic month check | Partial | Highlights/deadlines visible; weak actionability (OW-003) |
| Cross-domain hop | Partial | Ownership preserved; planning period lost (OW-004) |
| Recover from uncertainty | Partial | Unknown honest; partial/empty recovery uneven (OW-005…008) |

---

## Workflow Friction

### OW-001 — Mission / corrective links ignore `event` query

| Field | Value |
|-------|-------|
| **Evidence** | `mission-card.ts` emits `/calendar?event=${eventId}`; same pattern in `today-readiness.ts`, `campaign-brief.ts`, and many domain ops helpers. `calendar/page.tsx` only reads `view` and `date` — **never `event`**. No `/events/[id]` page exists. |
| **Risk** | **Critical** workflow discontinuity: “Open mission,” readiness corrective actions, Brief next-mission, and domain follow-ups return the operator to Day View with **no mission selected** |
| **Governance** | Safe (no unauthorized exposure) but **implies actionability that is not delivered** · reinforces EA-1 HL-005 |
| **Phase** | **Foundation** (mission selection / workspace entry contract) |
| **Priority** | Critical |
| **Owner** | Calendar Experience / Mission workflow |
| **Verify** | Each link type lands on selected mission or authorized corrective path |

### OW-002 — Week identifies work without mission progression

| Field | Value |
|-------|-------|
| **Evidence** | `WeekView.tsx` grid titles and mission rail are non-linking text; path is day → mission card → OW-001 dead end |
| **Risk** | Coordination view cannot complete a task without multi-hop friction |
| **Governance** | Presentation-only honored; progression missing |
| **Phase** | Foundation |
| **Priority** | High |
| **Owner** | Calendar Experience |
| **Verify** | From non-today week mission, measure clicks to authorized actionable context |

### OW-003 — Month commitments not traceable to work

| Field | Value |
|-------|-------|
| **Evidence** | Month highlights / upcoming deadlines name commitments without links; day/week cell links exist — inconsistent affordances in one view |
| **Risk** | Operator may treat presentation list as closed strategic review |
| **Governance** | Derived labeling concerns already EA-7 (HL-029); here the gap is **traceability of action** |
| **Phase** | Foundation |
| **Priority** | High |
| **Owner** | Calendar Experience |
| **Verify** | Highlight/deadline → authorized Day/Week or owning module |

---

## Context Switching

### Strong

- Day/Week/Month switcher preserves `date` (`CalendarViewSwitcher.tsx`).
- Date nav Previous/Next / Jump-to-current adapts per view (`CalendarDateNav.tsx`).

### Friction

### OW-004 — Cross-domain navigation drops planning period

| Field | Value |
|-------|-------|
| **Evidence** | Week/Month outbound links to `/brief`, `/command`, `/counties`, `/volunteers` omit selected period; week copy notes domain tiles reflect “today’s” owned readiness |
| **Risk** | Operator loses the week/month they were coordinating |
| **Governance** | Correct ownership (do not duplicate domain truth) — continuity problem |
| **Phase** | Foundation |
| **Priority** | High |
| **Owner** | Calendar + domain module owners |
| **Verify** | Non-current week/month → each outbound link declares selected period vs today |

### OW-009 — Deferred Agenda/Timeline/Mission chips (retained from EA-2)

| Field | Value |
|-------|-------|
| **Evidence** | `CalendarViewSwitcher.tsx` shows inert “· next” chips |
| **Risk** | Workflow dead-end expectation (already HL-013 / HL-022) |
| **Phase** | Hardening (AT/hide) · Foundation/V2 (real views) |
| **Priority** | Medium (tracked) |
| **Owner** | Calendar chrome |
| **Verify** | No false affordance; AT labels clear |

---

## Decision Interruptions

### OW-005 — Catalogue-partial recovery inconsistent (confirms HL-030)

| Field | Value |
|-------|-------|
| **Evidence** | `listEventsForActor` `take: 50`; Week warns empty days are Unknown when partial; Day says “No events for this day” without caveat; Month count annotation only |
| **Risk** | Empty Day can read as proven absence — Unknown doctrine stress |
| **Governance** | EA-7 DI-004 / **HL-030** confirmed by workflow lens |
| **Phase** | Hardening |
| **Priority** | High (already HL-030) |
| **Owner** | Calendar disclosure |
| **Verify** | >50-event fixture; Day/Week/Month claims align |

### OW-006 — Silent absence of day actions (permission / date)

| Field | Value |
|-------|-------|
| **Evidence** | Day actions omitted for read-only, limited events, non-today — no in-context reason distinguishing “nothing to do” / “not permitted” / “not this date” |
| **Risk** | Operator uncertainty; recovery unclear |
| **Governance** | RBAC correctly enforced — transparency gap (ties SEC-004 / HL-034) |
| **Phase** | Hardening |
| **Priority** | Medium |
| **Owner** | Mission workflow UX |
| **Verify** | Mutator vs read-only · today vs future — reason + recovery explicit |

### OW-007 — Empty-schedule recovery weaker on Calendar than Brief

| Field | Value |
|-------|-------|
| **Evidence** | Day empty = informational muted text; Brief offers add-mission / return paths |
| **Risk** | Direct Calendar entry has weaker recovery when activity expected |
| **Governance** | Consistency of recovery, not false data |
| **Phase** | Hardening |
| **Priority** | Medium |
| **Owner** | Calendar Experience |
| **Verify** | Zero missions: compare Day vs Brief recovery actions |

### OW-008 — Unknown tiles recover to “today” modules, not selected period

| Field | Value |
|-------|-------|
| **Evidence** | Week domain strip Unknown + links to owning modules for current-day readiness |
| **Risk** | Cannot resolve selected week’s Unknown without leaving period context |
| **Governance** | Strong ownership honesty; recovery needs period semantics |
| **Phase** | Foundation |
| **Priority** | High |
| **Owner** | Calendar + domain modules |
| **Verify** | Future/historical week Unknown tiles resolve that period’s evidence |

Week “What changed?” → today’s Brief (honest absence of week changelog) — interruption noted; Redesign XR-01 / HL-012 already covers hierarchy.

Weather `NOT_INTEGRATED` — PASS (no fake).

---

## Hardening Candidates

| Ledger | Source | Summary |
|--------|--------|---------|
| HL-030 | OW-005 | Already open — Day `cataloguePartial` parity (EA-9 confirms) |
| HL-043 | OW-006 | Explicit reason when day actions absent (permission / date / capability) |
| HL-044 | OW-007 | Empty Day recovery path parity with Brief (links only — no new features) |
| (HL-022) | OW-009 | Deferred chip AT / hide — already open |

---

## Foundation Candidates

| Ledger | Source | Summary |
|--------|--------|---------|
| HL-039 | OW-001 | Consume mission deep-link / Mission Workspace entry (reinforces HL-005) |
| HL-040 | OW-002 | Week mission-level progression into authorized context |
| HL-041 | OW-003 | Month highlight/deadline → Day/Week or owner path |
| HL-042 | OW-004 | Preserve or declare planning period on domain hops |
| HL-045 | OW-008 | Period-aware Unknown recovery routes |

---

## Strong / PASS

- Shared Day/Week/Month navigation preserves date context.
- Authorization before event list; safe projections per actor.
- Mission-day mutations RBAC/capability gated with conflict recovery.
- Unknown readiness never silently promoted to Ready.
- Calendar states presentation-only / non-owner role.
- Conflicts are signals — not autonomous rescheduling.
- Weather explicitly non-integrated.

---

## Deliverables check

```text
Operator Workflow Profile ..... YES
Workflow Friction ............. YES
Context Switching ............. YES
Decision Interruptions ........ YES
Hardening Candidates .......... YES
Foundation Candidates ......... YES
No Behavior Changes ........... YES
```

---

## Cross-audit correlation

| Theme | Audits |
|-------|--------|
| Architecture sound | EA-1…EA-8 · **EA-9** |
| Mission return path | EA-1 HL-005 · **EA-9 OW-001** |
| Unknown / partial honesty | EA-7 · EA-5 · **EA-9** |
| Authorization continuity | EA-8 · **EA-9** (capability silence OW-006) |
| Foundation shared surfaces | EA-3 · EA-6 · **EA-9** (mission entry contract) |
| Decision hierarchy | EA-2 (not re-scored; workflow only) |

---

## Metrics

| Metric | Effect |
|--------|--------|
| OCI | Blocked ↑ until HL-039 (primary action dead-end) |
| Decision portfolio | Unchanged score; workflow confirms Week/Month progression debt |
| ESI | ↑ via shared mission-entry + period-preserving hop contracts |
| Architecture Fitness | Held |

**Did we follow the governance?** **Yes.**

---

## Recommendation

Accept EA-9. Prioritize **HL-039** with HL-005 in Foundation readiness; keep OW-005 as HL-030 Hardening. No inline fixes.

## Architecture 1.0 Conformance Statement

EA-9 does not amend Architecture 1.0. Workflow fixes must preserve ownership, Unknown doctrine, and authorized mutation paths — not invent Calendar-owned domain truth.
