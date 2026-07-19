# EA-5 Inclusive Experience Audit

**Script ID:** `KCCC-EA-5-ACCESSIBILITY`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md` · `KCCC_AUDIT_CONSTITUTION.md`  
**Status:** COMPLETE  
**Assessment:** **PASS WITH FINDINGS**  
**Nature:** First **execution audit** under completed governance stack  
**Feature Freeze:** ACTIVE — discovery only · no redesign · no features  
**Evidence date:** 2026-07-19  

```text
Engineering question:
What evidence demonstrates compliance with the governance already in place?

EA-5 success criteria:
Architecture preserved
Accessibility objectively improved (via Hardening backlog — not inline redesign)
No Protected Assets weakened
OCI maintained or increased
ESI maintained or increased
Release Constitution still satisfied
```

---

## Executive Verdict

```text
EA-5 Inclusive Experience

Status ................ PASS WITH FINDINGS

Architecture .......... PRESERVED

Feature Freeze ........ HONORED

Governance compliance . YES

Inclusive gaps ........ DOCUMENTED → Hardening / Foundation / Redesign

Immediate fixes ....... NONE (audits discover; Hardening executes)
```

Governance guided the work: barriers identified without visual redesign, feature adds, or workflow expansion.

---

## Scope boundary (Feature Freeze)

| Allowed | Not allowed |
|---------|-------------|
| Identify barriers | Visual redesign |
| Measure / document compliance | New UI concepts |
| Record findings | Feature additions |
| Recommend Hardening work | Workflow expansion |
| Identify Foundation implications | New interaction models |

Redesign belongs to Experience Redesign 2.0 after Hardening.

---

## Evidence standard (findings)

Each finding includes: Evidence · Risk · Governance affected · Recommended phase · Priority · Owner · Verification method.

---

## Findings

### IE-001 — Month density is color-only

| Field | Value |
|-------|-------|
| **Evidence** | `MonthView` applies `month-density-light\|moderate\|heavy` — CSS background opacity only (`globals.css` ~1471–1480). Event count text exists in cell body but density class itself has no text/icon alternative. |
| **Risk** | Operators with low vision / color weakness may miss activity intensity; fails color-independence. |
| **Governance** | Audit Law 5 · Release a11y · OCI (confidence without fake data) |
| **Phase** | Hardening (label/count pattern) · Redesign (tokenized density legend) |
| **Priority** | High |
| **Owner** | Calendar presentation |
| **Verify** | Density communicated without color (count, pattern, or `aria` text) at 200% zoom |

### IE-002 — Deferred view chips lack clear AT semantics

| Field | Value |
|-------|-------|
| **Evidence** | `CalendarViewSwitcher`: Agenda/Timeline/Mission rendered as `<span class="chip" aria-disabled="true">` with “· next”. Not focusable (good). No `aria-label` explaining deferred/unavailable. |
| **Risk** | Screen-reader users may hear cryptic “Agenda next” without knowing it is intentionally deferred (Feature Freeze / Foundation). |
| **Governance** | Law 5 · Feature Freeze honesty · HC-COG-004 |
| **Phase** | Hardening |
| **Priority** | Medium |
| **Owner** | Calendar chrome |
| **Verify** | AT announces “unavailable — planned for later” (or chips hidden until ready) |

### IE-003 — Date navigation lacks destination context

| Field | Value |
|-------|-------|
| **Evidence** | `CalendarDateNav`: links labeled “Previous” / “Next” only — no `aria-label` with target date/week/month. Wrapper is a bare `<div>`, not `<nav aria-label="…">`. |
| **Risk** | Keyboard/AT users get weak orientation when stepping dates. |
| **Governance** | Law 5 · Decision Support (orientation) · OCI |
| **Phase** | Hardening |
| **Priority** | Medium |
| **Owner** | Calendar chrome |
| **Verify** | Each control announces direction + target period |

### IE-004 — Month/Week grids as large `role="list"`

| Field | Value |
|-------|-------|
| **Evidence** | `MonthView` / `WeekView` use `role="list"` + many `listitem` cells. Keyboard can tab through numerous day/week links. |
| **Risk** | Verbose SR traversal; high cognitive load (pairs EA-2). Not incorrect, but Foundation should provide a calmer grid pattern (table/grid semantics or skip links into grid). |
| **Governance** | Law 5 · Law 3 Simplicity · Foundation |
| **Phase** | Foundation (shared grid) · Hardening (optional “skip to schedule” link) |
| **Priority** | Medium |
| **Owner** | Calendar Foundation |
| **Verify** | Operator can reach primary decision content without linearizing entire grid |

### IE-005 — Month day-number / week links — small touch targets

| Field | Value |
|-------|-------|
| **Evidence** | `.month-day-number` / `.month-week-link` are text links inside cells; week link `font-size: 0.7rem`. Global buttons target 44px; these links do not. |
| **Risk** | Touch accuracy on phones; Feature Freeze forbids redesign — document for Redesign/Foundation density rules. |
| **Governance** | Law 5 · Foundation responsive rules |
| **Phase** | Foundation / Redesign (Wave 5 experience) |
| **Priority** | Medium |
| **Owner** | Calendar Foundation |
| **Verify** | Interactive targets ≥ 44×44 CSS px on touch breakpoints |

### IE-006 — Visibility legend not present on Day/Week/Month

| Field | Value |
|-------|-------|
| **Evidence** | `calendar-visibility-legend.tsx` exists; Day/Week/Month views do not render it. |
| **Risk** | Visibility/category meaning not available where operators work. |
| **Governance** | Law 4 Consistency · Foundation common legend · Law 5 |
| **Phase** | Foundation (shared legend) · Hardening optional mount |
| **Priority** | Medium |
| **Owner** | Calendar Foundation |
| **Verify** | Legend available on all calendar views without duplicating ownership |

### IE-007 — Domain Unknown tiles: text OK; wall remains cognitive

| Field | Value |
|-------|-------|
| **Evidence** | Week domain tiles show literal “Unknown” text + `title={reason}` — color-independent state word. Six equal tiles remain (EA-2/EA-4). |
| **Risk** | Inclusive access to meaning is OK; cognitive load still high — **not** fixed by inventing readiness (Never Fake). |
| **Governance** | Never Fake · Law 5 · HC-COG-007 · Redesign compact Unknown |
| **Phase** | Redesign (presentation) |
| **Priority** | High (UX) / Low (a11y semantics already textual) |
| **Owner** | Experience Redesign |
| **Verify** | Compact “awaiting data” pattern; still text-not-color; still Unknown |

---

## Protected Assets (reference)

Preserved: Architecture 1.0 · Never Fake · Unknown Doctrine · Feature Freeze · Owns-No-Facts · State model · skip-link · `:focus-visible` · `prefers-reduced-motion`.  
No new PA-* required. See `KCCC_PROTECTED_ASSETS_REGISTER.md`.

---

## Corrections

None required as emergency Architecture fixes. All items are presentation/inclusive hygiene.

---

## Hardening Items → Ledger

| Ledger | Finding | Summary |
|--------|---------|---------|
| HL-021 | IE-001 | Non-color density cue (count/pattern/`aria`) on month cells |
| HL-022 | IE-002 | Deferred chip AT labels (or hide until ready) |
| HL-023 | IE-003 | Date nav landmark + labeled Previous/Next targets |
| HL-024 | IE-004 | Optional skip-to-content within calendar page stack |

---

## Foundation Items

| Item | Finding |
|------|---------|
| Shared calendar grid semantics | IE-004 |
| Touch target rules for day cells | IE-005 |
| Common visibility/category legend on all views | IE-006 |

---

## Redesign Items

| Item | Finding |
|------|---------|
| Compact Unknown strip (not invent readiness) | IE-007 |
| Density legend + campaign visual system | IE-001 (visual layer) |
| Hero orientation (pairs XR-01) | supports IE-003/004 cognition |

---

## Metrics

| Metric | Effect of EA-5 itself |
|--------|------------------------|
| Architecture Fitness | Held (no ownership change) |
| Decision Support | Held (no new chrome) |
| OCI | Held — honesty preserved; improvement deferred to Hardening/Redesign |
| ESI | Slight ↑ via objective backlog (HL-021…024) |
| Accessibility | Baseline measured; improvement path defined |

**Release Constitution:** Still satisfied — no ship of new V1 features; recommendations do not invent truth.

---

## Recommendation

Accept EA-5. Do **not** implement inclusive fixes in this pass. Execute HL-021…024 in Hardening Wave 2/5 as appropriate; Foundation absorbs grid/legend/touch; Redesign absorbs Unknown wall presentation.

**Did we follow the governance?** **Yes.**

---

## Architecture 1.0 Conformance Statement

EA-5 does not amend Architecture 1.0. Inclusive recommendations must not invent readiness or weaken Never Fake.
