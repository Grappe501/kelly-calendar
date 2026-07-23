# Phase Two AI Evaluation Standard

```text
Status:        BINDING_CONTRACT
Date:          2026-07-23
Gate ADR:      ADR-103
Gate doc:      develop_notes/KCCC_PHASE_TWO_AI_QUALITY_GATE.md
Program:       KCCC-PHASE-TWO-INTELLIGENT-STATEWIDE-CAMPAIGN-CALENDAR-1.0
```

## Purpose

Practical evaluation contract for any Phase Two feature that calls OpenAI or otherwise emits model-influenced recommendations. Complements the AI quality gate (ADR-103). **IC-01 has zero OpenAI calls** and is outside this contract’s enablement path.

## When evaluation is required

| Situation | Required? |
|-----------|-----------|
| New AI-using feature before first enablement | **Yes** |
| Change to model, prompt, tools, scoring, or schema | **Yes — re-run** |
| Deterministic-only foundation (e.g. IC-01 geography) | **No AI eval** (still validate deterministic rules) |
| Docs-only / constants-only change | No |

## Fixture requirements

1. **Versioned fixtures** under a dedicated path (e.g. `develop_notes/evidence/phase-two-ai/<feature>/`) or an agreed `tests/` fixture tree.
2. Fixtures use **synthetic or approved redacted** campaign-shaped data only — no secret keys, no unnecessary real PII in git.
3. Each fixture declares:
   - Feature id and eval suite version
   - Input context (calendar window, Mission ids, geography ids — synthetic)
   - Expected **authority level** (Explain / Recommend / Draft / Apply / External)
   - Expected pass/fail per category (or N/A with justification)
4. Golden outputs may store **structured expected fields**, not brittle full prose, unless a category explicitly scores wording.

## Pass / fail per category

Every AI-using feature maps coverage to all **sixteen categories** in `KCCC_PHASE_TWO_AI_QUALITY_GATE.md`.

| Rule | Detail |
|------|--------|
| Suite pass | **All** applicable categories PASS; N/A allowed only with written justification |
| Category fail | Feature **must not** enable; kill switch remains ON / feature flag OFF |
| Partial pass | Not sufficient for enablement |
| Evidence | Record suite version, commit, date, operator/engineer, and summary counts |

### Suggested result shape

```text
Feature:           <IC-XX / surface id>
Eval suite version: <semver or date stamp>
Commit:            <hash>
Result:            PASS | FAIL
Categories:        16 rows with PASS | FAIL | N/A
Kill switch:       ON (blocked) | OFF (only if suite PASS + explicit enable auth)
```

## Kill switches

1. Every AI-using feature ships with a **fail-closed** kill switch (env and/or DB control), default **ON** (blocked) until eval PASS and explicit enablement.
2. Kill switch OFF requires: suite PASS evidence + documented enablement decision.
3. Kill switch may be activated immediately on production incident without waiting for a new ADR.
4. Disable must stop new model calls and must not leave half-applied mutations.

## Versioning

| Artifact | Versioned? |
|----------|------------|
| Prompt text / system instructions | Yes |
| Tool allowlist | Yes |
| Output schema | Yes |
| Model id / routing policy | Yes |
| Scoring rubrics | Yes |
| Fixture set | Yes |

Any change to the above bumps the eval suite version and **invalidates** prior enablement until re-run.

## Schema validation

- Structured outputs must validate before any downstream write or operator “Apply” path.
- Invalid JSON / schema mismatch → fail closed; count toward category 13.
- Deterministic services remain the source of truth for facts even when a model explains them.

## Unauthorized action & confirmation

- Categories 8 and 12 must include fixtures that **attempt** mutation / external action without confirmation and prove the system blocks them.
- Apply / External action paths require **fresh** human confirmation every time.

## Cost and latency

- Document per-feature budgets in the feature’s eval pack.
- Fixture runs should exercise representative prompt sizes; record token/cost estimates without storing secrets.

## Reporting

Durable evidence lives in develop_notes (or agreed evidence paths). Do not claim PASS without fixture results. Do not invent operator usefulness scores.

## Out of scope

- Fabricating eval results to unblock a ship
- Client-side OpenAI keys
- Unrestricted database tools for models
- Enabling AI on IC-01 (IC-01 has **zero** OpenAI calls)
