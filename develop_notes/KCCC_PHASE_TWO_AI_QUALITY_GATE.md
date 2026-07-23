# Phase Two AI Quality Gate

```text
Decision ID:   ADR-103
Authority:     Kelly Grappe / Phase Two program (ADR-093)
Date:          2026-07-23
Status:        REVIEWED_AND_ACCEPTED_FOR_PHASE_TWO_FOUNDATION
Program:       KCCC-PHASE-TWO-INTELLIGENT-STATEWIDE-CAMPAIGN-CALENDAR-1.0
Companion:     develop_notes/KCCC_PHASE_TWO_AI_EVALUATION_STANDARD.md
Related:       ADR-101 (owner acceptance) · ADR-102 (IC-01) · ADR-093 (vision)
```

## Purpose

Define and lock the **AI quality gate** required by ADR-093 before Phase Two IC-phase work. This gate is **accepted for Phase Two foundation** so geography and other non-AI foundation deliverables may begin. It does **not** enable any AI product surface.

## Status clarification (binding)

| Statement | Meaning |
|-----------|---------|
| Foundation work may begin | Yes — under separate per-IC authorization (e.g. ADR-102 for IC-01) |
| Each AI feature needs its own eval before enablement | **Yes — mandatory** |
| This gate enables OpenAI in production | **No** |
| IC-01 OpenAI calls | **Zero** — IC-01 is deterministic geography foundation only |

## Locked principles (from Kelly Phase Two script / program)

These principles are **binding** for all Phase Two AI work:

1. **Deterministic services own facts** — authorization, consent, coverage, conflicts, and permissible actions are established by deterministic services, not by model prose.
2. **AI explains and recommends within confirmation boundaries** — Explain / Recommend / Draft / Apply / External action levels remain in force.
3. **No silent mutation** — AI suggestions never silently become Events, Missions, assignments, contacts, calendar writes, or external actions.
4. **Apply and external action always require fresh human confirmation**.
5. **OpenAI API keys remain server-only** — never exposed to the browser or client bundles.
6. **Controlled application tools only** — Responses API / function calling / structured outputs; never unrestricted database access.
7. **Schema validation** — model outputs that affect product state must validate against explicit schemas before use.
8. **Evidence and citation** — answers that claim campaign facts must identify evidence; no invented travel routes; no silent geographic priority decisions.
9. **Distinguish authority of claims** — stored facts · deterministic calculations · AI inference · campaign-approved judgment must remain separable.
10. **Privacy and minimization** — no privacy leakage in prompts, logs, eval dumps, or operator-facing explanations beyond role-permitted data.
11. **No training / fine-tuning on campaign data** without an explicit separate decision.
12. **No inference of sensitive political beliefs or protected traits**; no targeted persuasion from sensitive attributes.
13. **Cost, latency, rate limits, quotas, caching, and audit traces** are first-class controls, not afterthoughts.
14. **Prompt / model / tool / scoring version history** must be retained so evals can be re-run on change.
15. **Kill switches** — every AI-using feature ships with a fail-closed disable path.
16. **Feature-level enablement** — passing this foundation gate does not enable a feature; that feature’s eval suite must pass first.

## Governing one-liner

> AI should understand and explain the campaign, but **deterministic services** must establish facts, authorization, consent, coverage, conflicts, and permissible actions.

## Sixteen evaluation categories

Every AI-using Phase Two feature must define fixtures and pass/fail criteria covering **all** of the following categories (see evaluation standard for contract details):

| # | Category | Intent |
|---|----------|--------|
| 1 | County gap | Correct identification of uncovered / under-covered counties from stored facts |
| 2 | Mission understanding | Accurate reading of Mission purpose, constraints, and related calendar context |
| 3 | Travel patterns | Reasoning from **stored** travel/calendar facts only; no invented routes or durations |
| 4 | Volunteer match | Ranking/explanation only; never silent assignment or contact |
| 5 | Hallucination | No fabricated Events, places, people, times, or policy |
| 6 | Citation / evidence | Claims cite allowable evidence; missing info is stated as missing |
| 7 | Privacy leakage | No unauthorized PII, addresses, or role-inappropriate detail in outputs or traces |
| 8 | Unauthorized-action attempts | Model/tool attempts to mutate or externalize without confirmation are blocked and recorded |
| 9 | Cost | Per-feature budget / token ceilings respected under fixture load |
| 10 | Latency | Operator-facing paths meet documented latency budgets |
| 11 | Operator usefulness | Explanations are actionable without replacing operator judgment |
| 12 | Confirmation-boundary compliance | Apply / External paths never complete without fresh confirmation |
| 13 | Schema / structured-output validation | Invalid structured outputs fail closed |
| 14 | Fact vs inference labeling | Outputs preserve distinction among stored / deterministic / inferred / campaign judgment |
| 15 | Tool allowlist / no unrestricted DB access | Only approved tools; no raw SQL or unbounded reads |
| 16 | Sensitive-attribute / persuasion prohibition | No sensitive-trait inference or persuasion from sensitive attributes |

## IC-01 exception (explicit)

**IC-01 (Arkansas Campaign Geography Foundation)** has **zero OpenAI calls**. It does not require an AI feature eval suite to ship. It must still obey deterministic geography rules (source-tagged priorities; no AI silent prioritization).

## Relationship

| Document | Role |
|----------|------|
| `KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md` | Program vision and IC list |
| `KCCC_PHASE_TWO_AI_EVALUATION_STANDARD.md` | Practical eval contract (fixtures, pass/fail, kill switches, versioning) |
| ADR-101 | Product-owner acceptance of CC baseline |
| ADR-102 | IC-01 authorization only |

## Acceptance

Status **`REVIEWED_AND_ACCEPTED_FOR_PHASE_TWO_FOUNDATION`** as of 2026-07-23. Foundation IC work may start under its own ADR. AI feature enablement remains gated by per-feature evaluation against the sixteen categories.
