# KCCC — Live-test launch operator guide (D26)

## Route

Authenticated operator only: `POST /api/communications/live-tests/[programId]` action `launch`  
UI: `/system/communications/live-tests/[programId]`

## Final screen must state

```text
This will send one real message to one verified destination.
It does not enable production campaign dispatch.
The authorization will be consumed after one provider submission attempt.
```

Primary button label: **Send one controlled test** (never “Launch campaign” / “Enable production”).

## Operator sequence

1. Confirm readiness APPROVED and authorization AUTHORIZED (not expired).  
2. Confirm emergency stop is clear.  
3. Type `SEND ONE CONTROLLED TEST`.  
4. Submit launch.  
5. Review execution evidence + post-test safety (production remains blocked).  
6. Complete post-test review before closing the program.

## Foundation ship note

Live wire remains blocked by production kill switches. Authorization may still be consumed after eligibility passes so the one-time token cannot be reused.
