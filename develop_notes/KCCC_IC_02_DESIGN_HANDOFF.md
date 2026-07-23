# IC-02 Design Handoff — RedDirt Read Integration

```text
Status:       SUPERSEDED / COMPLETE — implemented under ADR-104
Authorization: ACCEPTED (ADR-104) · IC_02_STATUS COMPLETE at ship
Predecessor:  IC-01 Arkansas Campaign Geography Foundation (ADR-102) COMPLETE
Program:      Phase Two · KCCC_PHASE_TWO_INTELLIGENT_STATEWIDE_CAMPAIGN_CALENDAR.md
Impl:         develop_notes/KCCC_IC_02_REDDIRT_READ_INTEGRATION.md
```

## Intent (from Phase Two program)

**IC-02 — RedDirt Read Integration:** server-only, **read-first** RedDirt adapter. No blind sync. No AI direct database access.

## Supersession

This design handoff is **SUPERSEDED** by ADR-104 authorization and the IC-02 implementation packet. Do not treat this document as a block on shipping. See:

- `KCCC_IC_02_AUTHORIZATION_KELLY_2026-07-23.md` (ADR-104)
- `KCCC_IC_02_REDDIRT_READ_INTEGRATION.md`
- `KCCC_IC_02_REDDIRT_READ_INTEGRATION_ROLLBACK.md`
- `KCCC_IC_02_REDDIRT_OPERATOR_GUIDE.md`
- `KCCC_IC_02_REDDIRT_DATA_PRIVACY_POLICY.md`

## Historical notes (pre-implementation)

IC-01 shipped the deterministic Arkansas geography authority (75 counties · top 250 places) without RedDirt credentials. IC-02 attaches read-only strategic geography observation and explicit apply onto that foundation.

Hard rules carried into implementation: no RedDirt writes · no OpenAI · no person import · no Event/Mission mutation · no Mobilize activation in IC-02.
