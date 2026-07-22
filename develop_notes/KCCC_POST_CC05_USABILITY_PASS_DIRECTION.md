# Post-CC-05 next pass — Operator Usability Pass 1 & Synthesis 1

```text
Decision ID:   ADR-091
Authority:     Kelly / program direction (2026-07-22)
Status:        ACCEPTED
Baseline:      main @ 46a72c3 · Netlify deploy 6a60efa8f25804bc9b16f3f3
```

## Decision

CC-05 Standing Availability Inputs is the new engineering baseline. ADR-090 legitimately authorized CC-05 but **did not** resolve the underlying Operator Usability Synthesis gate.

The **correct next pass** is therefore:

> Complete **Operator Usability Pass 1** and **Usability Synthesis 1** using the live **CC-01–CC-05** calendar.

Only after Synthesis 1 is completed, reviewed, and durably recorded may Kelly/Steve decide whether to authorize **CC-06: Conflict Engine — Calendar Slice**.

## Binding conditions

1. Do **not** mark Usability Synthesis complete because CC-05 shipped.
2. Do **not** treat ADR-090 as CC-06 authorization.
3. Do **not** begin CC-06 implementation until Synthesis 1 is reviewed and CC-06 is separately authorized.
4. Observation must use production (or production-equivalent) calendar with CC-01–CC-05 surfaces live.

## Evidence baseline (frozen for this decision)

| Artifact | Value |
|----------|-------|
| Git | `main` @ `46a72c3` |
| Netlify | deploy `6a60efa8f25804bc9b16f3f3` |
| Availability validator | 44 passed |
| Auto Event / Mission / conflict mutations | **0** |
| CC-06 | **unauthorized** |
| Synthesis 1 | **EMPTY** |

## Related docs

- Pass: `develop_notes/KCCC_OPERATOR_USABILITY_PASS_1.md`
- Synthesis: `develop_notes/KCCC_OPERATOR_USABILITY_SYNTHESIS_1.md`
- CC-05 waiver: `develop_notes/KCCC_CC_05_WAIVER_KELLY_2026-07-22.md` (ADR-090)
