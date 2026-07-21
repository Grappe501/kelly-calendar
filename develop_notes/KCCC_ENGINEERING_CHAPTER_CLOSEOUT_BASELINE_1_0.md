# Campaign OS — Engineering Chapter Closeout

```text
Chapter:       Calendar Foundation → Campaign OS Baseline 1.0
Status:        CLOSED
Sealed at:     commit era of Baseline 1.0 Frozen (see git history)
Next chapter:  Operator Observation → Baseline 1.1 → Step 12
```

## Architectural decisions that changed direction

These are not completed tasks—they are decisions that bind future work:

1. **From Calendar to Campaign Operating System** — dates → campaign operations  
2. **One Canonical Event** — every capability grows from a single operational truth  
3. **Operational vs Intelligence Layers** — define reality vs interpret reality  
4. **Campaign OS Doctrine #1** — the operator remains in control  
5. **Baseline 1.0 Frozen** — stable reference for evaluating change  

---

## Feature evaluation (against Baseline 1.0)

Before writing code, ask:

* Does it fit the single Event model?  
* Does it belong in the Operational layer or the Intelligence layer?  
* Does it preserve operator authority?  
* Does it build on observed operator behavior rather than assumptions?  

If any answer is **no**, revisit the design before implementation.

---

## Version path

```text
Baseline 1.0  (FROZEN — immutable snapshot)
        ↓
Operator Observation
        ↓
Evidence
        ↓
Baseline 1.1  (version-defining requirements from observation — not a bug list)
        ↓
Step 12
        ↓
Step 13
```

Observation results are **version-defining**. They become requirements for Baseline 1.1.  
Step 12 is the first capability built on validated operator experience—not merely “the next feature.”

---

## Immutability of Baseline 1.0

**Do not retroactively edit** `KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md` after observations.

Let it remain the snapshot of the system **before** real-world usage.  
Evidence-driven changes land in Baseline 1.1+ so the historical trace stays clear.

---

## Related

- Baseline 1.0: `KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md`  
- Doctrine #1: `KCCC_CAMPAIGN_OS_DOCTRINE_1.md`  
- Pass / Synthesis: `KCCC_OPERATOR_USABILITY_PASS_1.md` · `KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md`  
