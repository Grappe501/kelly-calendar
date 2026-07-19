# EA-6 Performance Audit

**Script ID:** `KCCC-EA-6-PERFORMANCE`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md` · `KCCC_AUDIT_CONSTITUTION.md`  
**Status:** COMPLETE  
**Assessment:** **PASS WITH FINDINGS**  
**Nature:** Measure-only · **no optimization · no code behavior changes**  
**Feature Freeze:** ACTIVE  
**Evidence date:** 2026-07-19  

```text
Mission:
Produce a performance profile and hotspot evidence
for Hardening and Foundation — stop before implementation.

Prohibited: premature optimization as audit work.
```

---

## Executive Verdict

```text
EA-6 Performance

Status .................... PASS WITH FINDINGS

Optimization during audit . NONE (honored)

Architecture .............. PRESERVED

Feature Freeze ............ HONORED

Heaviest path ............. Week/Month assembly + event list ACL loop

Foundation signal ......... STRONG (shared loaders / rendering)
```

---

## Performance Profile

| Surface | Server adapter LOC | UI LOC | Primary load path |
|---------|-------------------:|-------:|-------------------|
| Day | ~117 | ~154 | `listEventsForActor` → filter day → `loadMissionContextForIds` (≤12) → cards |
| Week | ~445 | ~270 | `listEventsForActor` → filter week → **batched** context (chunks of 12) → multi-panel assemble |
| Month | ~422 | ~228 | Same as week + ~42-cell grid + density/heat loops |

| Constraint | Value | Effect |
|------------|-------|--------|
| Event catalogue | `take: 50` in `listEventsForActor` | Caps work; `cataloguePartial` honesty |
| Mission context slice | `loadMissionContextForIds` hard-caps **12** ids per call | Week/Month chunk loop = ⌈N/12⌉ round trips |
| Access check | Per-event `canAccessEvent` inside list loop | Up to **50 sequential ACL checks** per calendar request |

Static structure (no runtime profiling in this pass — structural evidence only). Future Hardening may add timed smoke measurements without changing behavior.

---

## Hotspots

### PERF-001 — Sequential ACL in `listEventsForActor`

| Field | Value |
|-------|-------|
| **Evidence** | `event-service.ts`: `findMany({ take: 50 })` then `for (const event of events) { await canAccessEvent(...) }` |
| **Risk** | Latency grows ~linear with catalogue size; every Day/Week/Month request pays full list+ACL cost even when filtering to one day |
| **Governance** | Law 6 ESI · Law 3 Simplicity · never invent events |
| **Phase** | Hardening (batch ACL / range query — **behavior-preserving**) |
| **Priority** | High |
| **Owner** | Event service (owner path — calendar remains consumer) |
| **Verify** | Request timing / query count before vs after; same projections |

### PERF-002 — Full catalogue fetch for narrow views

| Field | Value |
|-------|-------|
| **Evidence** | Day/Week/Month each call `listEventsForActor` then filter by Chicago date keys in memory |
| **Risk** | Unnecessary projection work for out-of-range events; amplifies PERF-001 |
| **Governance** | Law 6 · Foundation shared catalogue helper |
| **Phase** | Hardening / Foundation (date-bounded list API owned by event service) |
| **Priority** | High |
| **Owner** | Event service + calendar assembly |
| **Verify** | Day view does not ACL-project unrelated months when range API exists |

### PERF-003 — Duplicated `loadMissionContextBatched`

| Field | Value |
|-------|-------|
| **Evidence** | Near-identical functions in week (~L148) and month (~L118) services; chunk size 12 matches loader cap |
| **Risk** | Drift + duplicate maintenance cost (ESI); not a runtime bug |
| **Governance** | Law 4 Consistency · HL-016 / EA-3 RC-01 |
| **Phase** | Foundation / Wave 3–4 Hardening prep |
| **Priority** | Medium |
| **Owner** | Calendar assembly module |
| **Verify** | Single shared helper; Week/Month call it |

### PERF-004 — Per-event mission card / timeline recompute

| Field | Value |
|-------|-------|
| **Evidence** | Week/Month/Day: each event runs `computeMissionTimeline` + `toMissionCard` + readiness builders in map loops |
| **Risk** | CPU on server per request; acceptable at ≤50 events; watch if catalogue grows |
| **Governance** | Law 6 · Never Fake (do not skip readiness to “speed up”) |
| **Phase** | Hardening (measure) · Foundation (shared card builder) |
| **Priority** | Medium |
| **Owner** | Calendar assembly |
| **Verify** | Profile under synthetic 50-event fixture (no PII) |

### PERF-005 — Month grid DOM (~42 cells)

| Field | Value |
|-------|-------|
| **Evidence** | `MonthView` renders full grid; density classes + per-cell day/week links |
| **Risk** | Fine at current size; virtualization **not** required now; document for growth |
| **Governance** | Law 3 — don’t virtualize early |
| **Phase** | Foundation (if cell count/content grows) · defer |
| **Priority** | Low |
| **Owner** | Calendar Foundation |
| **Verify** | Revisit if month cells gain rich media/lists |

### PERF-006 — Week View heaviest UI surface

| Field | Value |
|-------|-------|
| **Evidence** | WeekView ~270 LOC · many panels (domain strip, grid, rail, travel, county, candidate, volunteer, brief) — pairs EA-2 Week 5.8 |
| **Risk** | HTML weight + SR traversal (EA-5); server assembly longest |
| **Governance** | Redesign hierarchy (not perf hacks that hide panels dishonestly) |
| **Phase** | Redesign (panel weight) · Foundation (shared presenters) |
| **Priority** | Medium (UX) / Low (runtime) |
| **Owner** | Redesign / Foundation |
| **Verify** | Fewer equal-weight panels; same data honesty |

### PERF-007 — Client memoization opportunity: limited

| Field | Value |
|-------|-------|
| **Evidence** | Calendar pages are **Server Components**; little client React state on Day/Week/Month |
| **Risk** | Misapplying `useMemo` would not help SSR path |
| **Governance** | Law 3 Simplicity |
| **Phase** | None for V1 calendar views — note only |
| **Priority** | Info |
| **Owner** | — |
| **Verify** | Keep presentation server-driven unless Foundation introduces client islands |

---

## Root Causes

1. **Catalogue API shape** — unbounded-by-date list with per-row ACL (PERF-001/002).  
2. **Assembly duplication** — Week/Month copy batched context + multi-pass event loops (PERF-003/004).  
3. **View ambition vs consolidation** — Week packs many consumes into one response/UI (PERF-006).  
4. **Cap-based safety** — `take: 50` + context 12-cap keep worst-case bounded (protect; improve APIs inside caps).

---

## Hardening Candidates

| Ledger | Source | Summary | Priority |
|--------|--------|---------|----------|
| HL-025 | PERF-001 | Measure + design batch/cached ACL for `listEventsForActor` (no behavior change to projections) | High |
| HL-026 | PERF-002 | Date-range event list for calendar adapters (owner API; calendar consumes) | High |
| HL-027 | PERF-004 | Timed smoke fixture (≤50 synthetic events) documenting p50/p95 assemble — measure only first | Medium |

(HL-016 already covers shared assembly helper — keep linked to PERF-003.)

---

## Foundation Candidates

| Candidate | Source |
|-----------|--------|
| Shared calendar catalogue + partial helper | PERF-002/003 |
| Shared mission-context batch module | PERF-003 · HL-016 |
| Shared event/mission presenters (reduce Week panel HTML duplication) | PERF-006 |
| Month grid primitive (virtualize only if needed later) | PERF-005 |

---

## Deliverables check

```text
Performance Profile .......... YES
Hotspots ...................... YES (PERF-001…007)
Root Causes ................... YES
Hardening Candidates .......... YES (HL-025…027)
Foundation Candidates ......... YES
No Code Behavior Changes ...... YES
```

---

## Protected Assets

State model (server URL-driven) remains a performance **asset** — no client state explosion. Catalogue honesty (`cataloguePartial`) preserved. Never Fake: no skipping Unknown/readiness for speed.

---

## Metrics

| Metric | Effect |
|--------|--------|
| Architecture Fitness | Held |
| ESI | ↑ via hotspot backlog (measurable debt) |
| OCI | Held (no fake “fast” empty states) |
| Accessibility | Unaffected |

**Did we follow the governance?** **Yes.**

---

## Recommendation

Accept EA-6. Do not optimize in this pass. Execute measurements/API design in Hardening; extract shared loaders in Foundation Wave.

## Architecture 1.0 Conformance Statement

EA-6 does not amend Architecture 1.0. Performance work must not invent facts or move ownership into the calendar.
