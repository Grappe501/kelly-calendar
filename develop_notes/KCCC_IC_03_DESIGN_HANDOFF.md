# IC-03 Design Handoff — Mission Intelligence Profile

```text
Status:       DESIGN HANDOFF ONLY — NOT IMPLEMENTED
Authorization: NOT_AUTHORIZED (requires post–IC-02B ADR)
Predecessor:  IC-02 · IC-02A · IC-02B Mission Activation (ADR-106)
Program:      Phase Two · KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md
```

## Intent

**IC-03 — Mission Intelligence Profile:** structured, reviewable strategic profile per Mission. AI may propose purpose, value, coverage, audience, and related needs — never silently change the Mission.

## Inputs to combine (design only)

| Source | Role |
|--------|------|
| Mission purpose and type | Local Mission authority |
| IC-01 county / place / region / corridor | Canonical Arkansas geography |
| Approved IC-02 RedDirt strategic facts | Source-attributed context |
| **IC-02A reviewed Event outcomes** | Attributed evidence ≠ planned intent |
| **IC-02B activated workstreams** | Department readiness, overdue work, volunteer coverage, communications/logistics readiness, completed activation tasks |
| Schedule / Travel / Staffing / Field Ops / Incidents | Existing ops reads |
| Provenance and freshness | Observation + activation fingerprints |

### IC-02B readiness signals (design)

- activated workstreams
- department readiness / overdue activation tasks
- volunteer coverage vs needs (never treat RSVP as assignment)
- communications readiness (never SENT without verified dispatch)
- logistics readiness (reuse D11–D13 facts)
- completed activation tasks
- schedule fingerprint freshness

**IC-03 must distinguish planned intent, activation plan, and reviewed outcome.**

## Hard rules

- AI suggestions never silently change the Mission
- No Event auto-create from profile scores
- No OpenAI without per-feature eval (ADR-103)
- Preserve IC-02 / IC-02A privacy
- Preserve IC-02B internal-task vs external-action boundary

`IC_03_STATUS` remains **NOT_AUTHORIZED**.
