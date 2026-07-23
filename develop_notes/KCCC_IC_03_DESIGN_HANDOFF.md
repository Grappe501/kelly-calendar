# IC-03 Design Handoff — Mission Intelligence Profile

```text
Status:       DESIGN HANDOFF ONLY — NOT IMPLEMENTED
Authorization: NOT_AUTHORIZED (requires post–IC-02A ADR)
Predecessor:  IC-02 RedDirt Read · IC-02A Event Outcome / Hot Wash (ADR-105)
Program:      Phase Two · KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md
```

## Intent

**IC-03 — Mission Intelligence Profile:** structured, reviewable strategic profile per Mission. AI may propose purpose, value, coverage, audience, and related needs — never silently change the Mission.

## Inputs to combine (design only)

Deterministic Mission profiles should combine, when authorized:

| Source | Role |
|--------|------|
| Mission purpose and type | Local Mission authority |
| IC-01 county / place / region / corridor | Canonical Arkansas geography |
| Approved IC-02 RedDirt priority and focus-area facts | Source-attributed strategic context (`StrategicGeographyFact`) |
| **IC-02A reviewed Event outcomes** | **Attributed evidence — distinct from planned intent** |
| Schedule | Event/Mission schedule fields (read) |
| Travel | Travel/movement ops (read) |
| Staffing | Staffing assignments (read) |
| Logistics / Field Ops | Pack lists, field ops (read) |
| Incident and exception context | Incident log / exception digest (read) |
| Provenance and freshness | Observation timestamps + source attribution labels |

### IC-02A evidence fields (when review status is REVIEWED)

Mission Intelligence may consume, with source attribution and freshness:

- attendance outcome
- operational outcome
- reviewed takeaways (non-confidential or leadership-authorized)
- unresolved commitments
- Follow-up gaps
- county / place context from Event geography
- linked Mission context
- source freshness (`reviewedAt`, schedule fingerprint / stale flag)

**IC-03 must distinguish planned intent from reviewed outcome.** A Mission that
was planned as high-value but reviewed as `NOT_ATTENDED` / `UNSUCCESSFUL` must
not be scored as if the plan were reality.

Do **not** treat `REVIEW_DUE` or `DRAFT` as authoritative outcome evidence.

## Hard rules (carry forward)

- AI suggestions never silently change the Mission
- No Event auto-create from profile scores
- No OpenAI enablement without per-feature eval (ADR-103)
- Preserve IC-02 privacy exclusions (no person-level RedDirt bleed)
- Preserve IC-02A encounter privacy (no confidential hot-wash bleed into broad profiles)
- Distinguish stored facts · deterministic calculations · AI inference · campaign-approved judgment

## Explicit non-implementation

This document does **not** authorize Prisma models for Mission intelligence scores, OpenAI calls, or UI that pretends profiles are live.

`IC_03_STATUS` remains **`NOT_AUTHORIZED`** until a separate Kelly ADR after IC-02A ship evidence is accepted.
