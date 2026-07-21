# KCCC — Live-test consent policy (D26)

## Scope

`COMMUNICATIONS_CONTROLLED_LIVE_TEST`

Consent must bind:

- person  
- destination  
- channel  
- specific live-test purpose  
- consent source + timestamp  
- scope + expiration  
- revocation status  
- policy version  

General campaign contact permission does **not** automatically authorize the engineering live test.

D21 rechecks consent immediately before any provider submission path. Wrong channel, wrong destination, revoked, or expired consent blocks.
