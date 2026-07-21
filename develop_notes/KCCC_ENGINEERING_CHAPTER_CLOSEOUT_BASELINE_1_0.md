# Campaign OS — Engineering Chapter 1 Closeout

```text
Chapter:       Engineering Chapter 1
Title:         Calendar Foundation → Campaign OS Baseline 1.0
Status:        COMPLETE · PERMANENT REFERENCE
Sealed at:     Baseline 1.0 Frozen (immutable)
Next chapter:  Operator Observation → Baseline 1.1 → Step 12
```

## Transition this chapter marks

From:

> "We are building what we think a campaign needs."

To:

> "We are refining a system based on how campaigns are actually operated."

---

## What was accomplished

Not only software—the **rules by which future software will be built**:

| Model | Locked decision |
|-------|-----------------|
| Operational | One canonical Event |
| Architectural | Operational vs Intelligence layers |
| Governance | Operator authority (Doctrine #1) |
| Engineering | Architecture → observation → implementation |
| Release | Immutable baselines (1.0 frozen; 1.1 from evidence) |

These decisions reduce complexity as the project grows rather than adding to it.

---

## Architectural decisions that changed direction

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

## Post-observation review (four stages)

When returning after sessions, structure the review in this order only:

### Stage 1 — Evidence

No recommendations. Observations only from Kelly, Staff, and Steve.

### Stage 2 — Patterns

Only what is supported across observations. Isolated preferences only if they reveal a broader issue.

### Stage 3 — Baseline 1.1 Requirements

Translate validated patterns into concrete Baseline 1.1 requirements. These become Step 12 input.

### Stage 4 — Authorization

Only then decide whether Step 12 is:

* an incremental enhancement to the current operational flow, or  
* a more fundamental redesign of how availability is represented  

---

## Version path

```text
Baseline 1.0  (FROZEN — immutable snapshot)
        ↓
Operator Observation
        ↓
Evidence → Patterns → Baseline 1.1 Requirements → Authorization
        ↓
Baseline 1.1
        ↓
Step 12
        ↓
Step 13
```

Observation results are **version-defining**. Step 12 is the first capability built on validated operator experience.

---

## Immutability of Baseline 1.0

**Do not retroactively edit** `KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md` after observations.

Evidence-driven changes land in Baseline 1.1+ so the historical trace stays clear.

---

## Related

- Baseline 1.0: `KCCC_CAMPAIGN_OS_BASELINE_1_0_FROZEN.md`  
- Doctrine #1: `KCCC_CAMPAIGN_OS_DOCTRINE_1.md`  
- Pass / Synthesis: `KCCC_OPERATOR_USABILITY_PASS_1.md` · `KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md`  

```text
ENGINEERING_CHAPTER_1 = COMPLETE
BASELINE_1_0 = CLOSED
NEXT_ENGINEERING_DECISION = FROM_OBSERVATION_EVIDENCE_ONLY
```
