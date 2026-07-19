# KCCC Release Constitution

**Script ID:** `KCCC-RELEASE-CONSTITUTION`  
**Status:** ACTIVE  
**Scope:** Version 2.0, 2.1, 2.2, and every release thereafter  
**Sits above:** Version 2 backlog · Experience Redesign · Foundation · future features  
**Related:** `KCCC_AUDIT_CONSTITUTION.md` (audits) · `KCCC_V1_FEATURE_FREEZE.md` (V1 sealed)

```text
Purpose:
Stable release governance for every ship after Version 1.
```

---

## Pre-ship questions (all must be answerable)

Before shipping any release, answer:

1. **Does it preserve Architecture 1.0?**  
2. **Does it improve Operator Confidence (OCI)?**  
3. **Does it maintain or improve ESI?**  
4. **Does it maintain or improve Accessibility / inclusive experience?**  
5. **Does it avoid violating the Never Fake doctrine?**  
6. **Does it strengthen, not weaken, the Protected Assets?**  

If any answer is **no** without an explicit RFC / waiver recorded by Steve, **do not ship**.

---

## Release classes

| Class | Examples | Extra rules |
|-------|----------|-------------|
| Stabilization | Hardening-only | No new user-facing features |
| Experience | Redesign 2.0 slices | Never Fake · Law 5 Accessibility |
| Platform | Foundation | Owns nothing; shared primitives only |
| Capability | V2 views / modules | After Foundation; Version 2 backlog only |

Version 1 features are **not** added via any class — they go to the Version 2 backlog or are rejected.

---

## Metrics on every release review

| Metric | Direction |
|--------|-----------|
| Architecture Fitness | Maintain / improve · no drift |
| Decision Support | Improve or hold with justification |
| Visual Experience | Improve through Redesign; never fake trust |
| OCI | Improve without inventing truth |
| ESI | Maintain / improve |
| Inclusive access | Maintain / improve |

---

## Relationship to Audit Constitution

| Document | Governs |
|----------|---------|
| Audit Constitution | EA-5…EA-12 recommendations |
| Release Constitution | What may ship after V1 |
| Feature Freeze | V1 sealed; no new V1 features |

---

## Architecture 1.0 Conformance Statement

This constitution does not amend Architecture 1.0. Ownership changes still require RFC.
