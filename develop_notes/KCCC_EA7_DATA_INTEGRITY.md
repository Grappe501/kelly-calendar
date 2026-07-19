# EA-7 Data Integrity Audit

**Script ID:** `KCCC-EA-7-DATA-INTEGRITY`  
**Parent:** `KCCC_ENGINEERING_AUDIT.md` · `KCCC_AUDIT_CONSTITUTION.md`  
**Status:** COMPLETE  
**Assessment:** **PASS WITH FINDINGS**  
**Nature:** Evidence-only · **no behavior changes**  
**Feature Freeze:** ACTIVE  
**Governing question:**

> Can every piece of information shown in the Calendar Experience be traced back to an authoritative source without ambiguity?

**Evidence date:** 2026-07-19  

---

## Executive Verdict

```text
EA-7 Data Integrity

Status .................... PASS WITH FINDINGS

Governance Compliance ..... PASS

Architecture .............. PRESERVED

Traceability .............. MOSTLY STRONG

Integrity risks ........... LOCALIZED (attending default · unlabeled derives · brief echoes)

Never Fake ................ INTACT (with known presentation gaps from EA-1/EA-5)
```

---

## Data Integrity Profile

| Class | Calendar role | Traceability |
|-------|---------------|--------------|
| Safe event projections | Consume via `listEventsForActor` | Strong → event owner |
| Mission readiness / travel / geo snaps | Consume via `loadMissionContextForIds` | Strong → mission domains |
| Conflicts | Derive via overlap detector | Strong math · **weak attending input** |
| Campaign week index | Pure date display math | Strong as **display-only** (documented) |
| Domain strip | Explicit Unknown + link | Strong (honest non-ownership) |
| Weather | `NOT_INTEGRATED` | Strong (no fake) |
| Travel aggregates | Derive + partial flags | Strong if partial labels shown |
| Density / heat / ready% | Derive from loaded set | Reproducible · **label gaps** (HL-002/021) |
| Candidate schedule kinds | Title/calendar heuristics | **Weak provenance** — non-authoritative |
| Month `majorFocus` / brief echo | Heuristic from highlights | **Ambiguous** if read as brief-owned |
| `cataloguePartial` | Loader bound disclosure | Strong honesty |

---

## Integrity Risks

### DI-001 — Forced `candidateAttending: true` (Day/Week/Month)

| Field | Value |
|-------|-------|
| **Evidence** | All three view services pass `candidateAttending: true` into `detectCandidateOverlaps` |
| **Risk** | Conflict severity/presence may overstate candidate conflicts → false certainty |
| **Governance** | Never Fake · Trust · EA-1 H-AC-02 · HL-001 |
| **Phase** | Hardening (Wave 1) |
| **Priority** | Critical |
| **Owner** | Conflict input must come from attending owner or Unknown |
| **Verify** | Conflicts omit attending assumption or use Confirmed/Invited/Tentative/Unknown/N/A |

### DI-002 — Heuristic candidate-kind classification

| Field | Value |
|-------|-------|
| **Evidence** | `classifyCandidateKind` on titles/calendar types in week service; UI “Candidate schedule” |
| **Risk** | Operator may treat heuristic as Candidate-domain classification |
| **Governance** | Law 1 Truth · EP-07 Derived Metric · Never Fake |
| **Phase** | Hardening (label “heuristic / non-authoritative”) · later consume owner flag if exists |
| **Priority** | High |
| **Owner** | Presentation labeling |
| **Verify** | UI discloses non-authoritative; no write-back |

### DI-003 — Month brief fields echo `majorFocus`

| Field | Value |
|-------|-------|
| **Evidence** | Month service sets `brief.opportunities` and `brief.priorities` from `majorFocus` (highlight heuristic), while linking to `/brief` |
| **Risk** | Ambiguous: looks like Brief-domain content but is schedule-derived |
| **Governance** | Traceability · Law 1 · Link-to-Authority |
| **Phase** | Hardening (relabel as schedule-derived summary) · Redesign (hero/brief separation) |
| **Priority** | High |
| **Owner** | Month presentation |
| **Verify** | Copy cannot be mistaken for Executive Brief ownership |

### DI-004 — Cross-view consistency of catalogue bound

| Field | Value |
|-------|-------|
| **Evidence** | Day/Week/Month all use same `listEventsForActor` + `take: 50`; Week/Month expose `cataloguePartial`; Day empty schedule may lack equivalent banner |
| **Risk** | Day “No events” can be read as proven absence when catalogue truncated |
| **Governance** | EP-10 Catalogue Honesty · Unknown doctrine |
| **Phase** | Hardening |
| **Priority** | Medium |
| **Owner** | Day View disclosure |
| **Verify** | Day shows partial warning when `all.length >= 50` (same predicate) |

### DI-005 — Derived readiness % / density without authority label

| Field | Value |
|-------|-------|
| **Evidence** | Week `% ready of loaded missions`; month density classes — reproducible from loaded set |
| **Risk** | Confused with domain readiness (EA-1/EA-5) |
| **Governance** | Already HL-002 / HL-021 |
| **Phase** | Hardening |
| **Priority** | High (tracked) |
| **Owner** | Presentation |
| **Verify** | Labels say presentation/derived |

### DI-006 — Stale snap risk (inherent)

| Field | Value |
|-------|-------|
| **Evidence** | Per-request load of readiness/travel/day snaps — no calendar cache SoR |
| **Risk** | Normal request-time staleness vs concurrent owner updates |
| **Governance** | Acceptable; document refresh = reload |
| **Phase** | Docs / optional Hardening note |
| **Priority** | Low |
| **Owner** | Operator expectation |
| **Verify** | No durable calendar cache of business state (EA-3 state score) |

---

## Ownership Risks

| Risk | Status |
|------|--------|
| Calendar becomes SoR for schedule | **Not found** |
| Calendar invents domain readiness | **Not found** (Unknown strip) |
| Calendar invents weather | **Not found** |
| Calendar hosts mutation UI blur | Known EA-1 H-AC-04 — ownership of API OK |
| Heuristics presented as owned facts | **DI-002 / DI-003** |

---

## Traceability Findings

| UI signal | Source | Ambiguity? |
|-----------|--------|------------|
| Event title/time | Safe projection | No |
| Mission card fields | Mission context + event | No |
| Domain Unknown tiles | Explicit non-rollup | No |
| Conflicts | Overlap + forced attending | **Yes — DI-001** |
| Candidate list | Heuristic | **Yes — DI-002** |
| Month opportunities/priorities | majorFocus heuristic | **Yes — DI-003** |
| Campaign week # | Display math + footnote | Low |
| Travel miles Unknown/partial | Snaps + flags | Low if UI shows partial |

---

## Hardening Candidates

| Ledger | Source | Summary |
|--------|--------|---------|
| HL-001 | DI-001 | Already open — attending states (Critical) |
| HL-028 | DI-002 | Label candidate-kind rows as heuristic / non-authoritative |
| HL-029 | DI-003 | Relabel month brief echoes as schedule-derived; keep Brief link as authority |
| HL-030 | DI-004 | Day View `cataloguePartial` disclosure parity with Week/Month |
| (HL-002/021) | DI-005 | Already open — derived labels / density |

---

## Foundation Candidates

| Candidate | Why |
|-----------|-----|
| Shared provenance metadata on derived widgets | Consistent “derived / partial / unknown” chips |
| Shared conflict input contract (attending enum) | One place to consume owner attending |
| Shared catalogue-partial helper | DI-004 parity |

---

## Deliverables check

```text
Data Integrity Profile ........ YES
Integrity Risks ............... YES
Ownership Risks ............... YES
Traceability Findings ......... YES
Hardening Candidates .......... YES
Foundation Candidates ......... YES
No Behavior Changes ........... YES
```

---

## Cross-audit correlation

| Theme | Audits |
|-------|--------|
| Architecture sound | EA-1 · EA-3 · EA-6 · **EA-7** |
| Attending false certainty | EA-1 · **EA-7** |
| Derived labeling | EA-1 · EA-5 · **EA-7** |
| Foundation shared assembly/provenance | EA-3 · EA-6 · **EA-7** |

---

## Metrics

| Metric | Effect |
|--------|--------|
| Architecture Fitness | Held (risks are hygiene) |
| OCI | Path to ↑ via HL-001/028/029 honesty |
| ESI | ↑ via clearer provenance contracts |
| Never Fake | Intact; DI-001 is the dangerous exception to fix in Hardening |

**Did we follow the governance?** **Yes.**

---

## Recommendation

Accept EA-7. Prioritize Wave 1 **HL-001** with DI-028/029/030 in Hardening. No inline fixes.

## Architecture 1.0 Conformance Statement

EA-7 does not amend Architecture 1.0. Integrity fixes must increase honesty, not invent missing owner data.
