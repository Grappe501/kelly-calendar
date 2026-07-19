# KCCC Protected Assets Register

**Script ID:** `KCCC-PROTECTED-ASSETS`  
**Status:** LIVING  
**Parent:** `KCCC_AUDIT_CONSTITUTION.md`  
**Rule:** Cumulative register of engineering strengths. Audits **reference** this document; they do not re-list the full set unless adding a new asset.

```text
Protect what makes the system trustworthy and durable.
Do not dilute these in Hardening, Redesign, or Foundation.
```

---

## Register

| ID | Asset | Source | Notes |
|----|-------|--------|-------|
| PA-01 | Architecture 1.0 | Baseline `6690ce2` | Immutable except RFC |
| PA-02 | Trust Model | Phase 3.1 Pass with Conditions | Unknown doctrine upstream |
| PA-03 | Owns-No-Facts adapters | EA-1 · EP-02 | Calendar view services |
| PA-04 | Never Fake Doctrine | Product Health · EP-11 | No invented certainty |
| PA-05 | Unknown Doctrine | Trust · EP-03 | Unknown stays Unknown |
| PA-06 | State Management | EA-3 (8.0) · EP-06 | URL/presentation state; protected asset |
| PA-07 | Engineering Patterns | `KCCC_ENGINEERING_PATTERNS.md` | EP-01…EP-11 |
| PA-08 | Product Philosophy | Redesign charter lead | Operational heartbeat |
| PA-09 | Operator Decision Model | EA-2 | One primary decision per view |
| PA-10 | Safe Projections | EA-1 · EP-01 | Schedule atoms |
| PA-11 | Link-to-Authority | EA-1 · EP-04 | Drill-down to owners |
| PA-12 | Catalogue Honesty | EA-1 · EP-10 | Partial disclosure |
| PA-13 | Predictable Day/Week/Month nav | EA-2 · EA-3 | View/date zoom |
| PA-14 | Audit Constitution | This program | Six laws + one question |
| PA-15 | Hardening Master Ledger | Program | Single remediation surface |
| PA-16 | Release metrics suite | Product Health · EA-3 | Arch · Decision · Visual · OCI · ESI |
| PA-17 | Version 1 Feature Freeze | `KCCC_V1_FEATURE_FREEZE.md` | V1 never reopened; V2 backlog only |
| PA-18 | Release Constitution | `KCCC_RELEASE_CONSTITUTION.md` | Pre-ship questions for every release |
| PA-19 | Program Charter | `KCCC_PROGRAM_CHARTER.md` | Why phases exist; four immutable principles |
| PA-20 | Governance Execution mode | `KCCC_GOVERNANCE_EXECUTION.md` | Design complete; execute under existing stack |

---

## Intake

When an audit identifies a new protectable strength, add a `PA-*` row here in the same pass.  
When an audit finds a threat to a protected asset, record a Hardening item that **defends** it — do not weaken the asset to chase a feature.

## Architecture 1.0 Conformance Statement

This register does not amend Architecture 1.0.
