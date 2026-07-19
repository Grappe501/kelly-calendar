# KCCC Never Fake Doctrine

**Script ID:** `KCCC-NEVER-FAKE`  
**Status:** ACTIVE DOCTRINE  
**Source:** Version 1 Product Health Report (elevated 2026-07-19)  
**Binding with:** Architecture 1.0 · Trust Model · `KCCC_ENGINEERING_PATTERNS.md`  

```text
Never invent readiness.
Never invent attendance.
Never invent confidence.
Never estimate Unknown into truth.
Never let presentation become ownership.
Never hide uncertainty.
Never imply authority where only projection exists.
```

## Why this exists

Operator confidence must rise from **clarity and honesty**, not from fabricated certainty. Raising OCI (Operator Confidence Index) by inventing facts is a **doctrine violation**, not a UX win.

## Enforcement

| Context | Rule |
|---------|------|
| Hardening | Prefer Unknown / N/A / partial over defaults that look factual (see HL-001) |
| Redesign | Compact Unknown presentation — do not fill with estimates-as-fact |
| Foundation / V2 | New views inherit Never Fake; no “helpful” invented rollups |
| Redesign AI (when authorized) | Contextual insights must be labeled non-authoritative; never fill Unknown as fact; no unsourced opponent claims |
| Release review | If OCI rose via invented truth → **fail** release hygiene |

## Related patterns

EP-03 Unknown Preservation · EP-05 Partial Integration · EP-07 Derived Metric · EP-08 Canonical Owner
