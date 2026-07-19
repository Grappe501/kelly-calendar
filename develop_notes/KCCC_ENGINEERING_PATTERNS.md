# KCCC Engineering Patterns

**Script ID:** `KCCC-ENGINEERING-PATTERNS`  
**Status:** ACTIVE DOCTRINE  
**Source:** EA-1 Protected Patterns (elevated 2026-07-19)  
**Baseline:** Architecture 1.0 (`6690ce2`)  
**Rule:** Future engineering **references these patterns before adding features**. Patterns do not amend Architecture 1.0; they encode how V1 preserved it.

```text
Purpose:
Make “what worked under pressure” reusable doctrine —
not tribal knowledge trapped in an audit report.
```

---

## Pattern index

| ID | Pattern |
|----|---------|
| EP-01 | Safe Projection Pattern |
| EP-02 | Owns-No-Facts Adapter Pattern |
| EP-03 | Unknown Preservation Pattern |
| EP-04 | Link-to-Authority Pattern |
| EP-05 | Partial Integration Pattern |
| EP-06 | Presentation-State Pattern |
| EP-07 | Derived Metric Pattern |
| EP-08 | Canonical Owner Pattern |
| EP-09 | Orchestrate-Don't-Mutate Pattern |
| EP-10 | Catalogue Honesty Pattern |
| EP-11 | Never Fake Pattern |

---

## EP-01 Safe Projection Pattern

**Intent:** Schedule atoms exposed to presentation are safe projections, not raw owner records.  
**Do:** Consume actor-scoped list/projections (`listEventsForActor` → safe event blocks).  
**Don't:** Embed owner tables or write paths into calendar adapters.  
**Evidence:** Calendar Day/Week/Month services.

---

## EP-02 Owns-No-Facts Adapter Pattern

**Intent:** View assembly services declare and behave as non-owners.  
**Do:** Document “owns no facts”; load from mission/event/geo owners; assemble read models only.  
**Don't:** Persist calendar-owned operational truth or invent domain rollups.  
**Evidence:** `calendar-*-view-service.ts` headers.

---

## EP-03 Unknown Preservation Pattern

**Intent:** Unknown remains Unknown unless the canonical owner resolves it.  
**Do:** Show Unknown + reason; weather `NOT_INTEGRATED`; never coerce null → 0/false as fact.  
**Don't:** Unknown → Estimated → Displayed as Fact.  
**Trust Model:** Aligns with Phase 3.1 Pass with Conditions doctrine.

---

## EP-04 Link-to-Authority Pattern

**Intent:** Drill-downs terminate at authoritative modules.  
**Do:** Link `/counties`, `/volunteers`, `/candidate`, `/brief`, `/command`, domain homes.  
**Don't:** Duplicate editing workflows inside the calendar.  
**Target evolution (H-AC-04):** Calendar → Mission Workspace → Mutation → Return.

---

## EP-05 Partial Integration Pattern

**Intent:** Incomplete integrations and aggregates disclose incompleteness.  
**Do:** `knownMilesPartial`, weather not integrated, rental days Unknown when not owned.  
**Don't:** Fill gaps with plausible defaults that look authoritative.

---

## EP-06 Presentation-State Pattern

**Intent:** UI/session state stays presentation/session — never business/canonical.  
**Do:** `?view=` / `?date=` for zoom; ephemeral derives per request.  
**Don't:** localStorage or calendar caches that become systems of record.

---

## EP-07 Derived Metric Pattern

**Intent:** Computed values are reproducible, labeled, and non-authoritative.  
**Do:** Prefer copy like “Derived readiness estimate (loaded missions)” / “Presentation summary.”  
**Don't:** Visual language that mimics domain-owned readiness (`Ready: 82%`).  
**Hardening seed:** H-AC-01.

---

## EP-08 Canonical Owner Pattern

**Intent:** Every displayed value answers: who owns it?  
**Do:** Ownership tables in audits; answers point outside the calendar.  
**Don't:** Let “the calendar” become the answer for operational truth.

---

## EP-09 Orchestrate-Don't-Mutate Pattern

**Intent:** Calendar navigates; owners mutate.  
**Do:** Prefer navigate-to-owner; if quick actions remain, document as **delegated** mutations to owner APIs.  
**Don't:** Appear to manage mission state as if calendar were the workspace.  
**Hardening seed:** H-AC-04.

---

## EP-10 Catalogue Honesty Pattern

**Intent:** Loader bounds and empty states do not prove absence of activity.  
**Do:** `cataloguePartial` disclosure; treat empty days as Unknown under caps.  
**Don't:** “No events” as proven global truth when the catalogue is truncated.

---

## EP-11 Never Fake Pattern

**Intent:** Confidence never comes from invented certainty.  
**Do:** Unknown, partial, N/A, link-to-owner, labeled derives.  
**Don't:** Invent readiness, attendance, confidence, or authority.  
**Canon:** `KCCC_NEVER_FAKE_DOCTRINE.md` · Product Health Principle 3.

---

## Fitness trend (reference)

```text
Version 1 baseline (EA-1) ..... 7.9/10
After Hardening (target) ...... 8.8+
After Foundation / V2 ......... maintain ≥ 9.0
```

The number matters less than the trend: improve hygiene while preserving architectural integrity.

## Change control

- Additive pattern docs: allowed without Architecture RFC.  
- Pattern that changes ownership / Unknown doctrine: **RFC required** (Architecture 2.0+).  
- New features should cite relevant EP-IDs in PR or design notes when material.
