# KCCC — Production provider readiness (D26)

## Provider states

| State | Usable for D26 live test? |
|-------|---------------------------|
| `DISABLED` | No |
| `SANDBOX_ONLY` | No |
| `LIVE_TEST_READY` | Yes (only) |
| `PRODUCTION_READY_FUTURE` | Informational — **unusable** |
| `REVOKED` | No |

## Required proofs (no secrets stored)

- Credentials authenticate server-side  
- Production API reachable  
- Sender + domain identity valid where applicable  
- Webhook signing configured; events normalize  
- Suppression sync supported  
- Minimum credential scope  
- Idempotency metadata supported  
- Outbound ↔ webhook correlation possible  

Never store API keys, auth headers, or webhook signing secrets in readiness evidence JSON.
