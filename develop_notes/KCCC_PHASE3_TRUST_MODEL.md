# KCCC Phase 3.1 — Trust Model

**Script ID:** `KCCC-PHASE3-TRUST-MODEL`  
**Status:** READY FOR REVIEW  
**Parent:** Phase 3 Build Design · Exit Review  
**Nature:** Design-governance only · No implementation  
**Architecture baseline:** Architecture 1.0 (`6690ce2`) — immutable; this artifact does not amend it  

```text
KCCC PHASE 3.1
TRUST MODEL

Status:
READY FOR REVIEW

Output:
Accepted trust doctrine for Phase 3 design

Does NOT authorize:
  3.2 Identity · 3.3 Automation · planning · implementation
```

## Executive Question

> Can we trust every piece of information entering the system?

## Governance Checkpoint

Completion of this draft produces **one** outcome:

| Outcome | State |
|---------|-------|
| This artifact | `READY FOR REVIEW` |
| Gates 3.2–3.9 | **BLOCKED** until this model is **accepted** |
| 3.10 Transition | **BLOCKED** until 3.9 AUTHORIZED |
| Planning | NOT AUTHORIZED |
| Implementation | NOT AUTHORIZED |

Acceptance (Pass / Pass with Conditions) is a separate operator decision. Drafting Identity, Automation, or any code is forbidden until acceptance is recorded.

---

## 1. Trust Principles (Constitutional)

These principles bind all later Phase 3 artifacts. They refine Architecture 1.0 Integration, Unknown, and AI doctrine; they do not replace them.

| # | Principle |
|---|-----------|
| T1 | Every operational fact has **exactly one** canonical owner. |
| T2 | **Phase 1 owns operational truth.** Phase 2 owns workflows/experiences. Phase 3 owns trust, connectivity, governance, and scale — not kernel facts. |
| T3 | External systems are **sources of information**, never canonical owners of campaign operational truth. |
| T4 | AI is **advisory only**. AI cannot create, overwrite, or finalize canonical truth. |
| T5 | Human decisions supersede advisory recommendations within defined governance (roles in 3.2; gates in 3.3). |
| T6 | **Unknown** is a first-class state. Inventing values to hide Unknown is a violation. |
| T7 | Conflicting or unavailable external data surfaces as **Unknown** or **explicit conflict** — never silent overwrite. |
| T8 | Every authoritative fact carries **provenance** sufficient for audit reconstruction (detailed in 3.5). |
| T9 | Trust classification is explicit. Unclassified external input is treated as **untrusted**. |
| T10 | This model must not violate Architecture 1.0. Ownership or Constitution changes require RFC → Architecture 2.0+. |

---

## 2. Canonical Truth Hierarchy

### 2.1 Precedence order (highest → lowest)

When information about the same operational concern appears in more than one place, precedence is:

```text
1. Human-authorized canonical write in the owning Phase 1 system
2. Phase 1 kernel / owning module persisted state
3. Phase 2 capability assembly (read/compose only — never a parallel system of record)
4. Trusted external signal (classified Trusted or Conditional — never owner)
5. Advisory / interpreted output (analytics, AI, heuristics)
6. Untrusted or Unknown external input
```

Lower layers may **inform** higher layers. They may not **replace** them without a human-authorized write into the canonical owner.

### 2.2 Ownership by fact class

| Fact class | Canonical owner | May inform | Must not own |
|------------|-----------------|------------|--------------|
| Schedule / mission events | Phase 1 Calendar / Mission schedule | Google Calendar, registration feeds | External calendars |
| Constituent / relationship state | Phase 1 Constituent Operations | CRM exports, signup lists | External CRM |
| Communications readiness & send state | Phase 1 Communications Operations | ESP/SMS delivery reports | Email/SMS vendor |
| Candidate ops state | Phase 1 Candidate Operations | Staff notes from externals | Third-party schedulers |
| Debate / media ops state | Phase 1 Debate & Media Operations | Outlet calendars, media lists | External media tools |
| Fundraising ops state | Phase 1 Fundraising Operations | Payment/processor signals | Processor as CRM-of-record |
| GOTV ops state | Phase 1 GOTV Operations | Walk-list / vendor signals | Vendor voter file as KCCC truth |
| Petition / ballot orchestration state | Phase 1 Petition & Ballot (orchestration) | County / SOS public signals | External petition platforms as owner |
| Workflow progress / experience state | Phase 2 capability owning the workflow | Kernel facts | Parallel fact stores |
| Trust classification, sync policy, conflict policy | Phase 3 governance (this model) | Operators | Kernel fact ownership |
| Advisory interpretation | Operational Intelligence / Analytics (non-owning) | All layers | Canonical writes |

Consumers may read and assemble. They may not redefine ownership.

### 2.3 Internal vs external truth

| Kind | Definition | Authority |
|------|------------|-----------|
| **Internal truth** | Facts persisted by a KCCC owning module under human or gated process | Canonical for that fact class |
| **External information** | Data originating outside KCCC | Never canonical; admitted only under §3 |
| **Assembled context** | Phase 2 composition of internal truth (+ labeled externals) | Non-owning view |
| **Advisory output** | AI, analytics, heuristics | Non-authoritative; attributable |

---

## 3. External Information Policy

### 3.1 Admission rule

No external system is admitted by implication. Admission requires (at design time, before any implementation authorization):

1. Named system and purpose  
2. Fact classes it may **inform**  
3. Trust classification (§3.2)  
4. Sync mode (§5)  
5. Conflict policy (§4)  
6. Provenance fields required (§7)  
7. Explicit statement that it is **not** the canonical owner  

### 3.2 Trust classification

Every external source has exactly one classification:

| Class | Meaning | May influence canonical state? |
|-------|---------|--------------------------------|
| **Trusted** | Contracted/operated source with known identity, retention, and failure behavior; used as a primary *signal* | Only via human-authorized or Approve→Execute write into the owning module |
| **Conditional** | Useful but incomplete, delayed, or jurisdictionally limited | Same as Trusted, with mandatory conflict/Unknown surfacing |
| **Advisory** | Contextual only (weather, maps, news, AI summaries) | Never direct canonical write |
| **Untrusted** | Unknown provenance, unverified scrape, anonymous tip, or failed attestation | Display/quarantine only; no auto-promotion |
| **Blocked** | Explicitly forbidden (policy, legal, or integrity) | No ingest |

**Default:** If classification is missing → treat as **Untrusted**.

### 3.3 Example classifications (illustrative — not an integration authorization)

| External system | Suggested class | Informs | Canonical owner remains |
|-----------------|-----------------|---------|-------------------------|
| Google Calendar | Conditional | Schedule suggestions | Calendar / mission schedule |
| CRM export | Conditional | Contact import candidates | Constituent Operations |
| Email/SMS provider webhooks | Trusted (delivery signals) | Delivery/readiness signals | Communications Operations |
| Mapping / weather | Advisory | Logistics context | Consuming Phase 1 module |
| Public county / SOS pages | Conditional | Petition/ballot *signals* | Petition orchestration / kernel |
| Anonymous web form without controls | Untrusted until verified | Quarantine queue | Owning module after human accept |

These examples do **not** authorize building those integrations.

### 3.4 What “trusted” never means

- Trusted ≠ owner  
- Trusted ≠ auto-write to canonical state  
- Trusted ≠ AI may fill gaps  
- Trusted ≠ silence Unknown on failure  

---

## 4. Conflict Resolution

### 4.1 Detection

A **conflict** exists when:

- Two or more sources assert incompatible values for the same operational fact identity; or  
- An external signal disagrees with persisted canonical state; or  
- Timestamps/version tokens indicate stale overwrite risk; or  
- Required provenance is missing for an asserted authoritative change.

Conflicts must be **explicit objects** (design requirement for later engineering) — not silent last-write-wins.

### 4.2 Resolution policy matrix

| Situation | Automatic reconcile? | Required outcome |
|-----------|----------------------|------------------|
| External vs canonical; values differ | **No** | Surface conflict; canonical unchanged |
| Two Trusted externals disagree; no canonical yet | **No** | Unknown or Conflict; human chooses owner write |
| Duplicate import of identical payload (same provenance hash) | **Yes** (idempotent ignore) | No state change; audit “duplicate ignored” |
| Additive non-overlapping fields (e.g. external adds optional note field policy allows) | **Yes only if** owning module policy lists the field as externally fillable *and* empty/Unknown | Fill with provenance; else human |
| Advisory vs canonical | **N/A** | Advisory labeled; canonical unchanged |
| Untrusted vs anything | **No** | Quarantine; no promotion |
| Clock skew / stale external newer than rejected local | **No** | Conflict + human |

### 4.3 Human review triggers (mandatory)

Human review is required when any of the following hold:

- Conflict touches schedule, constituent identity linkage, compliance-sensitive, or public-facing communications state  
- Trust class is Conditional/Untrusted and promotion is requested  
- Provenance incomplete  
- Offline catch-up would overwrite newer canonical state  

Authority of who may resolve conflicts is deferred to **3.2 Identity & Authority** (blocked until this model is accepted).

---

## 5. Synchronization Model

### 5.1 Direction

| Mode | Allowed when | Forbidden when |
|------|--------------|----------------|
| **Pull** (KCCC fetches external) | Default for most Trusted/Conditional sources | Source would become treated as owner |
| **Push** (external calls KCCC) | Delivery webhooks, verified inbound hooks | Unauthenticated or Untrusted push |
| **One-way into KCCC (inform)** | Normal integration pattern | — |
| **One-way out of KCCC (export)** | Explicit export policy; copy is non-canonical elsewhere | Export used as system of record for campaign ops |
| **Bi-directional** | Only if each direction has separate trust class, conflict policy, and **canonical owner remains KCCC** for campaign ops facts | Calendar “dual master,” CRM dual master, or any shared ownership |

**Default:** One-way inform (pull or verified push) into non-owning staging → human or Approve→Execute promotion into owner.

### 5.2 Cadence and failure

| Concern | Rule |
|---------|------|
| Freshness | Each sync path declares expected latency; stale beyond threshold → mark signal **stale** (not false) |
| Failure | Hard failure → last good canonical retained; external facet → Unknown or Unavailable — not invented |
| Partial failure | Per-field Unknown preferred over dropping whole records silently |
| Retry | Retries must be idempotent; never escalate Untrusted to Trusted by retry count |

### 5.3 Offline behavior

| Condition | Behavior |
|-----------|----------|
| External unreachable | Canonical state remains; external-dependent facets → Unknown/Unavailable |
| Local offline (device) | Local drafts are non-canonical until accepted by owning system when online |
| Queue replay after offline | Replay cannot bypass conflict policy; newer canonical wins until human resolves |
| Split brain (two writers) | Forbidden design; if detected → Conflict, freeze auto-promotion |

### 5.4 Synchronization path register (design requirement)

Every future integration must be enterable in a path register with:

`source · class · direction · fact classes · owner · conflict policy · offline behavior · provenance schema`

Empty register is valid today. Undocumented path is **not** permitted at implementation time.

---

## 6. Unknown State

### 6.1 Preservation

Unknown is preserved when:

- Owning system has not established the fact  
- External required for a *signal* is missing, stale, or failed  
- Conflict is unresolved  
- Classification is Untrusted and no human has accepted a value  
- AI or analytics lacks basis  

Unknown is **not** zero, false, empty string, “probably fine,” or a guessed default.

### 6.2 Resolution

Unknown may be resolved only by:

1. A write from the **canonical owner** (human or Approve→Execute gated process), or  
2. Explicit operator acceptance of an external candidate **into** the owner, with provenance, or  
3. Domain declared `NOT_REQUIRED` under Readiness doctrine (not a fake value)

### 6.3 Prohibitions

| Prohibition | Rationale |
|-------------|-----------|
| AI inventing missing facts | Violates AI doctrine + Unknown doctrine |
| Silent coercion of Unknown → false/0 | Hides operational risk |
| External auto-fill of required canonical fields | Violates T3 |
| Averaging readiness across Unknown domains | Violates Readiness doctrine |

---

## 7. Evidence Chain & Trust Scoring

### 7.1 Provenance requirements (authoritative facts)

Every authoritative (canonical) fact must be reconstructable with:

| Field | Purpose |
|-------|---------|
| `fact_id` / stable identity | What changed |
| `owner_system` | Canonical owner |
| `actor` | Human or gated automation identity (3.2) |
| `source_kind` | `internal` · `external` · `advisory` |
| `source_name` | Named system or “operator” |
| `trust_class` | At time of admission |
| `observed_at` / `accepted_at` | Temporal evidence |
| `input_ref` | Pointer to raw payload or import batch (no secret values in logs) |
| `decision` | `accepted` · `rejected` · `conflict` · `ignored_duplicate` |

Detailed ledger mechanics belong to **3.5 Audit & Recovery** (blocked). This section sets the **minimum evidence obligation**.

### 7.2 Confidence levels (non-owning)

Confidence scores may label *signals* and *advisory* outputs. They **never** elevate trust class or create canonical truth.

| Level | Use |
|-------|-----|
| `confirmed` | Canonical owner has accepted |
| `corroborated` | Multiple Conditional/Trusted signals agree; still non-canonical until owner write |
| `single_source` | One external signal only |
| `advisory` | AI/analytics |
| `unknown` | Insufficient evidence |

### 7.3 Audit linkage

- Trust decisions (classify, promote, reject, conflict resolve) are auditable events.  
- Advisory outputs must remain distinguishable from canonical facts (`application: "kelly-calendar"` attribution preserved for AI).  
- End-to-end recovery procedures are specified in 3.5 — not here.

---

## 8. Trust Scoring (admission hygiene)

Scoring is a **design aid** for classifying sources, not a substitute for classification.

| Dimension | Question |
|-----------|----------|
| Identity | Is the source cryptographically or contractually identifiable? |
| Integrity | Can tampering be detected? |
| Freshness | Are timestamps reliable? |
| Completeness | Are required fields present? |
| Alignment | Does the source’s semantic model map cleanly to an owner fact class? |
| Failure clarity | Does the source fail closed (explicit error) vs. fail open (garbage data)? |

Low score → Conditional, Advisory, Untrusted, or Blocked — never “Trusted by default.”

---

## 9. Architecture 1.0 Conformance

| Architecture 1.0 rule | Trust Model response |
|-----------------------|----------------------|
| Phase 1 owns operational truth | §2 hierarchy; externals never outrank kernel |
| Externals never become owners | T3; §3 admission |
| Unknown is first-class | §6 |
| AI advisory only; no canonical writes | T4; §6.3 |
| Conflicts → Unknown or explicit conflict | §4 |
| Phase 3 does not take kernel ownership | §2.2 Phase 3 row |
| RFC for ownership/Constitution change | T10 |

**Conformance statement:** This Trust Model does not amend Architecture 1.0 and does not authorize implementation.

---

## 10. Acceptance Criteria (self-check for review)

Reviewers must be able to answer each without ambiguity:

| # | Criterion | Draft answer locus |
|---|-----------|--------------------|
| ✓ | Every operational fact has one canonical owner | §2.2 |
| ✓ | Every external source has an explicit trust classification | §3.2 (default Untrusted) |
| ✓ | Every synchronization path is documented | §5.4 register requirement |
| ✓ | Every conflict has a defined resolution policy | §4.2 |
| ✓ | Unknown is explicitly preserved | §6 |
| ✓ | AI cannot create canonical truth | T4, §6.3 |
| ✓ | Every authoritative fact has provenance | §7.1 |
| ✓ | Trust model does not violate Architecture 1.0 | §9 |

---

## 11. Deliverables Checklist

- [x] Canonical truth hierarchy  
- [x] Internal vs external truth  
- [x] Trust scoring  
- [x] Synchronization rules  
- [x] Conflict resolution  
- [x] External system precedence  
- [x] Unknown handling  
- [x] Offline behavior  
- [x] Evidence chain (minimum)  
- [x] Trust principles  

---

## 12. Explicit Non-Outcomes

This document does **not**:

- Accept itself (operator must accept)  
- Authorize 3.2 Identity drafting as an open workstream  
- Authorize automation rules (3.3)  
- Authorize any integration build  
- Authorize Phase 3 planning (requires 3.9 AUTHORIZED)  
- Authorize implementation (separate governance decision)  
- Change `candidate_data_ready`, `real_candidate_data_enabled`, or `ai_enabled`  

---

## Gate Result

| Result | Notes |
|--------|-------|
| ☐ Pass | Operator acceptance — all §10 criteria unambiguous |
| ☐ Pass with Conditions | List conditions; 3.2 remains blocked until conditions cleared or explicitly waived into 3.2 scope |
| ☐ Fail | Return to Architecture Review revision of this artifact |

**Current status:** READY FOR REVIEW — gate result unset.

---

## Revision

| Field | Value |
|-------|-------|
| Drafted for review | 2026-07-19 |
| Baseline reference | Architecture 1.0 @ `6690ce2` |
| Next after acceptance | 3.2 Identity & Authority Model (draft) |
| Next if not accepted | Revise this Trust Model; keep 3.2–3.10 blocked |
