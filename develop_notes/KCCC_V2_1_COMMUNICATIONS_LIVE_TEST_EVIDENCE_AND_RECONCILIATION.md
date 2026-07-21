# KCCC — Live-test evidence & reconciliation (D26)

## Evidence record

`CommunicationLiveTestEvidence` separates:

- Provider accepted  
- Provider reported delivered  
- Recipient independently confirmed receipt  

Opens/clicks are **not** proof of delivery and are not required for D26.

## Reconciliation

Uses existing signed webhook infrastructure. Preserve provider event ID, replay fingerprint, normalized event, timestamps, signature result, attempt match, and evidence hash.

## Recipient confirmation

Stored separately (`NOT_REQUESTED` / `PENDING` / `CONFIRMED` / `NOT_RECEIVED` / `UNCERTAIN`) and must not overwrite provider evidence.
