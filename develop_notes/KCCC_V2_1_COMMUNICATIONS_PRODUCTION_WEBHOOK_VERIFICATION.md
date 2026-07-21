# KCCC — Production webhook verification (D26)

Before live dispatch, production webhooks must prove:

- Endpoint reachable  
- Unsigned / invalid signature rejected  
- Stale timestamp rejected where supported  
- Replay handled idempotently  
- Valid signed webhook accepted  
- Events normalize; unknown events fail closed per policy  
- No session auth required; secrets remain server-side  

## States

`ENDPOINT_UNVERIFIED` → `SIGNATURE_VERIFIED` → `NORMALIZATION_VERIFIED` → `RECONCILIATION_VERIFIED`

Live test may proceed after signature + normalization. Reconciliation may complete via the actual test.

**Webhooks must never launch a live test.**
