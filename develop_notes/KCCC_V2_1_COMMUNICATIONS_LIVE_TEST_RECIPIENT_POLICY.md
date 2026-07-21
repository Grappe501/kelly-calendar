# KCCC — Live-test recipient policy (D26)

## Allowlist

Exactly **one** approved recipient in the initial ship.

Allowed destinations:

- Campaign-controlled address/phone  
- Operator-controlled test destination  
- Person who explicitly agreed to the live test  

Prohibited: audience manifests, random supporters, inferred/stale destinations, arbitrary client destination input, contact-list uploads.

## Ownership methods (minimum)

- `OPERATOR_ATTESTATION`  
- `CAMPAIGN_CONTROLLED_DESTINATION`  

Record who/when/what/why and expiration. Raw destinations are masked; fingerprints are deterministic.
