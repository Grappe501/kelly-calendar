# KCCC — Live-test emergency stop (D26)

## Controls

- Revoke authorization  
- Block live-test launch  
- Disable provider live-test mode (`SANDBOX_ONLY` / `DISABLED`)  
- Activate global communications kill switch  
- Activate provider kill switch  

## Behavior

| Timing | Effect |
|--------|--------|
| Before provider submission | Prevents launch |
| After provider submission | Prevents further submissions; reconciliation continues; do not claim accepted requests were cancelled |

Visible on program, readiness, authorization, launch, execution, provider controls, and Communications nav surfaces.
