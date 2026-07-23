# IC-02A Authorization — Event Outcome and Hot Wash

```text
Authorization: AUTHORIZED
ADR:           ADR-105
Date:          2026-07-23
Authority:     Kelly product requirement + build script
Baseline tip:  c7e43db (IC-02 evidence)
```

## Decision

Authorized calendar-improvement pass **between IC-02 and IC-03** to ship
**IC-02A: Event Outcome and Hot Wash**.

Does **not** renumber or replace IC-03. IC-03 remains design-only / NOT_AUTHORIZED
until a separate ADR after IC-02A ship evidence.

## Product requirement

After an Event has finished or its scheduled time has passed, operators must be
able to evaluate what happened; disposition attendance and operational outcomes;
conduct a hot wash; record takeaways and people met; preserve follow-up needs.

## Fundamental rule

**Time passing does not prove attendance or completion.** Elapsed schedule end
makes an Event `REVIEW_DUE` only — never auto-complete, never auto not-attended,
never Mission lifecycle mutation, never fabricated people/consents/communications.

## Scope

- Additive Prisma models + migration `ic02a_event_outcome_hot_wash`
- Eligibility service, APIs, mobile hot-wash UI, review queue/report
- Encounter privacy (no silent Person/consent)
- Follow-up soft linkage with confirmation
- Docs, validator, ICS privacy hardening
- Full ship: commit, push, Netlify, evidence

## Explicit non-goals

- No IC-03 Mission Intelligence Profile implementation
- No OpenAI calls
- No RedDirt writes
- No push notifications (IC-11 contracts only)
- No reopening IC-01 / IC-02
