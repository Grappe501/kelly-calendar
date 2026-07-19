# KCCC Phase 3.1 — Trust Model

**Script ID:** `KCCC-PHASE3-TRUST-MODEL`  
**Status:** PASS WITH CONDITIONS  
**Parent:** Phase 3 Build Design · Exit Review  
**Nature:** Design-governance only · No implementation  
**Architecture baseline:** Architecture 1.0 (`6690ce2`) — immutable; this artifact does not amend it  

```text
KCCC PHASE 3.1
TRUST MODEL

Review Status ............... PASS WITH CONDITIONS

Planning Authorization ...... NO
Implementation Authorization  NO

3.2 Identity Model .......... REMAINS BLOCKED

ACCEPTED requires operator verification of Conditions §13
```

## Executive Question

> Can we trust every piece of information entering the system?

## Governance Checkpoint

| Outcome | State |
|---------|-------|
| This artifact | **PASS WITH CONDITIONS** |
| Final acceptance | **Not yet** — Conditions §13 must be verified in-document by operator |
| Gates 3.2–3.9 | **BLOCKED** until status becomes **ACCEPTED** |
| 3.10 Transition | **BLOCKED** until 3.9 AUTHORIZED |
| Planning | NOT AUTHORIZED |
| Implementation | NOT AUTHORIZED |

---

## 1. Trust Principles

These principles **rely on** Architecture 1.0; they do not replace Constitution §§3–10.

| # | Principle | Relies on Architecture 1.0 |
|---|-----------|----------------------------|
| T1 | Every operational fact has **exactly one** canonical owner | Constitution §3 Canonical Ownership |
| T2 | **Phase 1 owns operational truth.** Phase 2 owns workflows/experiences. Phase 3 owns trust/connectivity/governance/scale — not kernel facts | Constitution §§3–5, Layer table |
| T3 | External systems are **sources of information**, never canonical owners | Constitution §8 Integration Doctrine |
| T4 | AI is **advisory only** and cannot create canonical truth | Constitution §10 AI Doctrine |
| T5 | Human decisions supersede advisory recommendations within defined governance | Constitution §§9–10; roles deferred to 3.2 |
| T6 | **Unknown** is first-class; inventing values to hide it is a violation | Constitution §6 Unknown Doctrine |
| T7 | Conflict or unavailable external data → **Unknown** or **explicit conflict** — never silent overwrite | Constitution §8 |
| T8 | Every authoritative fact carries provenance sufficient for audit | Constitution §13 exit criteria; detail in 3.5 |
| T9 | Trust classification is mandatory; unclassified → **Unknown** class | Constitution §8 |
| T10 | No amendment to Architecture 1.0; ownership/Constitution change requires RFC → Architecture 2.0+ | Freeze / Governance State |

---

## 2. Canonical Ownership Matrix (complete)

**Rule:** Exactly one canonical owner per operational domain. Consumers may read/assemble. They may not redefine ownership.

This is the **complete domain matrix** for Phase 3 trust design — not an illustrative sample.

### 2.1 Phase 1 operational domains (canonical owners)

| Domain | Canonical owner | Executive question (Constitution §11) | Does **not** own |
|--------|-----------------|----------------------------------------|------------------|
| **Calendar / schedule truth** | Phase 1 Calendar / Mission schedule (kernel schedule subsystem) | What must happen when? | External calendars, CRM, AI |
| **Executive command state** | Phase 1 Executive | What requires leadership attention now? | Domain facts owned elsewhere |
| **Field operations state** | Phase 1 Field | Are field actions executable and tracked? | Voter file, external turf apps as SoR |
| **County operations state** | Phase 1 County | Is each county operationally covered? | External county portals as SoR |
| **Volunteer truth** | Phase 1 Volunteer | Do we have enough people to execute the plan? | External volunteer apps as SoR |
| **Communications truth** | Phase 1 Communications | Is everyone communicating the same campaign? | ESP/SMS vendors as SoR |
| **Logistics state** | Phase 1 Logistics | Can people and materials arrive on time? | Mapping/weather vendors |
| **Finance state** | Phase 1 Finance | What is our resource position? | Payment processors as campaign SoR |
| **Compliance truth** | Phase 1 Compliance | Are we filing-ready and disclaimer-safe? | Outside counsel tools as SoR |
| **Constituent / relationship truth** | Phase 1 Constituent | Who are we engaging and in what state? | External CRM as SoR |
| **Operational Intelligence outputs** | *Non-owning* — Phase 1 Operational Intelligence | What do canonical facts imply? | **Never** operational facts |
| **Candidate ops state** | Phase 1 Candidate Operations | Candidate-day execution truth | Experience UIs as SoR |
| **Debate / media ops state** | Phase 1 Debate & Media Operations | Debate/media execution truth | Outlet tools as SoR |
| **Fundraising ops state** | Phase 1 Fundraising Operations | Resource-generation workflow state (Finance owns resource *position*) | Processors as SoR |
| **GOTV ops state** | Phase 1 GOTV Operations | GOTV coordination state | Vendor voter file as KCCC truth |
| **Petition / ballot orchestration** | Phase 1 Petition & Ballot | Petition/ballot orchestration state (not signature SoR) | External petition platforms |

### 2.2 Readiness ownership

| Concern | Canonical owner | Rule |
|---------|-----------------|------|
| **Domain readiness** (per required domain) | The Phase 1 module that owns that domain | Unknown remains Unknown until that owner establishes it |
| **Aggregate operational readiness** | *Derived, non-owning* — computed as **minimum** of required domains (Constitution §7) | No separate “readiness database” may invent domain values |
| **Capability / experience readiness** (Phase 2) | Phase 2 capability owning that workflow experience | May assemble domain readiness; may not override domain owners |

### 2.3 Phase 2 / Phase 3 / AI

| Domain | Canonical owner | Notes |
|--------|-----------------|-------|
| Workflow progress / experience state | Phase 2 capability that owns the workflow | Not a parallel system of record for Phase 1 facts |
| Trust classification, sync policy, conflict policy | Phase 3 governance (this model) | Does not own kernel facts |
| **AI outputs** | **No canonical owner as truth** — advisory artifacts only | Owned as *advisory records* (attributable); **never** as operational truth |
| Assembled executive views | Non-owning presentation | Must label Unknown, Conflict, Advisory |

### 2.4 Direct answers (conditions checklist)

| Question | Answer |
|----------|--------|
| Who owns calendar truth? | Phase 1 Calendar / Mission schedule |
| Who owns volunteer truth? | Phase 1 Volunteer |
| Who owns communications truth? | Phase 1 Communications |
| Who owns readiness? | Each domain owner for domain readiness; aggregate readiness is **derived minimum**, not a competing owner |
| Who owns compliance? | Phase 1 Compliance |
| Who owns AI outputs? | **Nobody as canonical truth.** AI outputs are advisory artifacts only (Constitution §10) |

### 2.5 Precedence (highest → lowest)

```text
1. Human-authorized canonical write in the owning Phase 1 system
2. Phase 1 owning-module persisted state
3. Phase 2 capability assembly (read/compose only)
4. Campaign Controlled / Verified Third Party / Official Government signals (never owner)
5. Advisory Only (analytics, AI, heuristics)
6. Unknown / Rejected external input
```

---

## 3. External Trust Classification

Every external (and non-canonical internal mirror) source has **exactly one** class:

| Class | Meaning | May become canonical? |
|-------|---------|------------------------|
| **Official Government** | Government / election-authority published data with identifiable issuer | Only via human or Approve→Execute write into owning module |
| **Verified Internal** | KCCC-controlled subsystem or campaign-operated store already under kernel governance (re-read/sync) | Already internal if owner; else promote only through owner |
| **Verified Third Party** | Contracted vendor with known identity, retention, failure behavior | Signal only; promote only through owner |
| **Campaign Controlled** | Campaign-operated external (e.g. campaign Google Workspace) under campaign admin control | Signal only; not a dual master |
| **Advisory Only** | Context, weather, maps, news, AI, analytics | Never direct canonical write |
| **Unknown** | Classification missing, attestation failed, or provenance insufficient | Quarantine / display as Unknown; no auto-promotion |
| **Rejected** | Explicitly forbidden (policy, legal, integrity) | No ingest |

**Default:** Missing classification → **Unknown**.

**Mapping note:** Prior draft labels Trusted/Conditional/Untrusted/Blocked map to Verified Third Party or Campaign Controlled / Official Government or Verified Third Party / Unknown / Rejected. The classes in this table are **normative**.

### 3.1 Admission requirements

Before any future implementation authorization, each source must declare:

1. Name and purpose  
2. Fact classes it may **inform**  
3. Trust class (this table)  
4. Sync mode (§5)  
5. Conflict row (§4)  
6. Provenance schema (§7)  
7. Explicit non-ownership statement  

### 3.2 Illustrative class assignments (not integration authorization)

| Source | Class | Informs | Owner remains |
|--------|-------|---------|---------------|
| County / SOS official pages | Official Government | Petition/ballot *signals* | Petition orchestration / kernel |
| ESP/SMS delivery webhooks | Verified Third Party | Delivery signals | Communications |
| Campaign Google Calendar | Campaign Controlled | Schedule suggestions | Calendar / mission schedule |
| CRM export | Verified Third Party or Campaign Controlled | Contact *candidates* | Constituent |
| Weather / maps | Advisory Only | Logistics context | Logistics |
| AI summary | Advisory Only | Interpretation | No operational owner |
| Anonymous tip / scrape | Unknown | Quarantine only | Owner after human accept |
| Blocked scraper | Rejected | — | — |

---

## 4. Conflict Resolution Matrix

Conflicts are **explicit objects**. Silent last-write-wins is forbidden.

### 4.1 Source A vs Source B

| Source A | Source B | Winner | Escalation | Audit | Fallback |
|----------|----------|--------|------------|-------|----------|
| Phase 1 canonical owner | Any external class | **Owner (A)** | None for auto-overwrite; human may later accept B into A | Record conflict; A unchanged | Keep A; mark B as Conflict/Rejected signal |
| Official Government | Verified Third Party | **Neither auto** | Human review → write into owner | Both payloads + decision | Unknown/Conflict until owner write |
| Verified Third Party | Campaign Controlled | **Neither auto** | Human review → write into owner | Both + decision | Unknown/Conflict |
| Campaign Controlled | Advisory Only | **Campaign Controlled signal only** (still not owner) | If promotion desired → human into owner | Label Advisory ignored for authority | Canonical unchanged |
| Advisory Only | Anything canonical | **Canonical** | None | Advisory retained as advisory | Canonical unchanged |
| Unknown or Rejected | Anything | **Anything else for authority; Rejected discarded** | Human only if promoting Unknown | Quarantine log | Canonical unchanged; Unknown preserved |
| External (any) | External (any), no canonical yet | **Neither** | Human chooses owner write | Dual-source conflict | Fact remains Unknown |
| Identical payload (same provenance hash) | Duplicate of self | **Idempotent ignore** | None | `ignored_duplicate` | No state change |
| Newer stale external (clock drift) | Newer canonical | **Canonical** | Human if operator insists external is correct | Drift flagged | Keep canonical; mark external stale |
| Offline queued write | Newer online canonical | **Canonical** until human | Human merge | Queue + versions | Conflict object; no silent replay overwrite |

### 4.2 Mandatory human escalation

Human review is mandatory when conflict touches: schedule, volunteer identity linkage, constituent identity linkage, compliance, public-facing communications, or when provenance is incomplete.

**Who** may resolve is deferred to **3.2 Identity** (still blocked).

---

## 5. Unknown Preservation

### 5.1 Forbidden path (explicit)

```text
PROHIBITED:

  Unknown
     │
     ▼
  AI Guess / inference presented as fact
     │
     ▼
  Canonical Truth

This path is an architectural violation (Constitution §§6 and 10).
```

### 5.2 Allowed Unknown resolution only

1. Canonical owner write (human or Approve→Execute), or  
2. Explicit human acceptance of an external candidate **into** the owner with full provenance, or  
3. Domain marked `NOT_REQUIRED` (not a fabricated value)

### 5.3 Unknown is not

Zero · false · empty · “probably fine” · model confidence threshold · averaged readiness filler.

---

## 6. Synchronization Rules

| Concern | Rule |
|---------|------|
| **Offline (external unreachable)** | Canonical retained; external-dependent facets → Unknown/Unavailable |
| **Offline (local device)** | Local drafts are non-canonical until accepted by owning system online |
| **Delayed sync** | Declare expected latency; beyond threshold → signal **stale** (not false); do not invent |
| **Duplicate updates** | Idempotent by provenance hash; duplicates → `ignored_duplicate` audit; no double apply |
| **Clock drift** | Prefer canonical version/token; drifted external → stale/Conflict; no auto-win by wall clock alone |
| **External failure** | Fail closed for promotion; last good canonical retained; facet Unknown/Unavailable |
| **Retry** | Idempotent retries only; retry count never upgrades trust class |
| **Idempotency** | Required for all pull/push/replay paths |
| **Push vs pull** | Pull default; push only if authenticated and class ≠ Unknown/Rejected |
| **Bi-directional** | Forbidden as dual-master; allowed only as two one-way paths with KCCC owner retained |
| **Split brain** | Forbidden; if detected → Conflict + freeze auto-promotion |

**Sync path register (mandatory before implementation):**  
`source · class · direction · fact classes · owner · conflict row · offline · retry · idempotency key · provenance schema`

---

## 7. Provenance (every canonical fact)

Every canonical fact must answer:

| Question | Field / requirement |
|----------|---------------------|
| **Where did it originate?** | `source_kind` + `source_name` (+ `input_ref` to raw batch; no secrets in logs) |
| **When?** | `observed_at` (source) and `accepted_at` (owner write) |
| **Who changed it?** | `actor` (human or gated automation identity — defined in 3.2) |
| **Why?** | `decision_reason` / `decision` (`accepted` · `rejected` · `conflict` · `ignored_duplicate` · `owner_edit`) |
| **Confidence?** | `confidence` on signals/advisory only; canonical acceptance implies `confirmed` for that fact — confidence **never** creates ownership |

Additional: `fact_id`, `owner_system`, `trust_class` at admission.

Ledger mechanics → **3.5 Audit & Recovery** (blocked). This section is the minimum evidence obligation.

---

## 8. AI Doctrine (explicit allow / deny)

### 8.1 AI may

- Interpret canonical and labeled external signals  
- Recommend actions  
- Summarize  
- Forecast (labeled advisory)  
- Flag anomalies / conflicts / Unknown gaps  

### 8.2 AI must never

- Become canonical  
- Override canonical ownership  
- Invent operational facts  
- Resolve Unknown into a fabricated value  
- Write to canonical operational state  
- Unlabel advisory output as truth  

### 8.3 Attribution

Advisory output remains attributable (`application: "kelly-calendar"`).  
`ai_enabled` remains false until explicitly unlocked under separate governance.

---

## 9. Architecture 1.0 Conformance Statement

**Affirmation:** This Trust Model **extends Phase 3 governance design** under Architecture Review. It **introduces no amendments** to the Architecture 1.0 baseline corpus sealed at `6690ce2`.

| Constitutional principle relied on | How this artifact uses it |
|------------------------------------|---------------------------|
| §3 Canonical Ownership | Complete domain matrix §2; one owner per domain |
| §4 Operational Truth (Phase 1) | Precedence §2.5; externals never outrank kernel |
| §5 Capability Orchestration | Phase 2 row non-owning for facts |
| §6 Unknown Doctrine | §5 Unknown Preservation; forbidden AI path |
| §7 Readiness Model | Aggregate readiness derived as minimum; domain owners retain facts |
| §8 Integration Doctrine | Classes §3; conflict §4; sync §6 |
| §9 Automation Doctrine | Promotion only human / Approve→Execute (detail in 3.3) |
| §10 AI Doctrine | Allow/deny §8 |
| Freeze / RFC | T10; no Constitution rewrite |

**Non-amendment declaration:** No change to Architecture 1.0 ownership model, Unknown doctrine, Integration doctrine, or AI doctrine is made or implied. Future ownership changes require RFC → Architecture 2.0+.

---

## 10. Conditions for Final Acceptance (operator verification)

Issued review: **PASS WITH CONDITIONS** (document inspection required before ACCEPTED).

| # | Condition | Addressed in |
|---|-----------|--------------|
| C1 | Complete canonical ownership matrix (not examples only) | §2 |
| C2 | Explicit external trust classes | §3 |
| C3 | Conflict matrix with Winner / Escalation / Audit / Fallback | §4 |
| C4 | Unknown → AI Guess → Canonical prohibited | §5.1 |
| C5 | Sync: offline, delay, duplicate, drift, failure, retry, idempotency | §6 |
| C6 | Provenance: where / when / who / why / confidence | §7 |
| C7 | AI may / must never lists | §8 |
| C8 | Architecture 1.0 conformance without amendment | §9 |

**Operator action to reach ACCEPTED:** Verify each row C1–C8 inside this file, then record Gate Result **Pass** (or list residual conditions). Until then, **3.2 remains BLOCKED**.

---

## 11. Acceptance target (not yet in force)

When C1–C8 are verified:

```text
KCCC PHASE 3.1

Status ............... ACCEPTED

Architecture Review .. CONTINUES

3.2 Identity Model ... AUTHORIZED TO DRAFT

Planning ............. NOT AUTHORIZED

Implementation ....... NOT AUTHORIZED
```

---

## 12. Explicit Non-Outcomes

This document does **not**:

- Grant unconditional Pass  
- Authorize 3.2 drafting (**still blocked**)  
- Authorize planning or implementation  
- Authorize any integration build  
- Change `candidate_data_ready`, `real_candidate_data_enabled`, or `ai_enabled`  

---

## Gate Result

| Result | Notes |
|--------|-------|
| ☐ Pass | Final acceptance after C1–C8 verified |
| ☑ Pass with Conditions | Conditions §10 (C1–C8); 3.2 remains BLOCKED |
| ☐ Fail | Return for revision |

**Current status:** PASS WITH CONDITIONS — awaiting operator verification for ACCEPTED.

---

## Revision

| Field | Value |
|-------|-------|
| Drafted | 2026-07-19 |
| Pass with Conditions recorded | 2026-07-19 |
| Conditions revision | Complete matrix, normative trust classes, conflict matrix, sync table, AI allow/deny, Conformance Statement |
| Baseline | Architecture 1.0 @ `6690ce2` |
| Next | Operator verifies C1–C8 → ACCEPTED → open 3.2 draft only |
