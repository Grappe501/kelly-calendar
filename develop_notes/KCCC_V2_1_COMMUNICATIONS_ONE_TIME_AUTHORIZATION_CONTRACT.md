# KCCC — One-time authorization contract (D26)

## Object

`CommunicationLiveTestAuthorization` binds exact:

- program revision  
- readiness review hash  
- provider / sender / artifact / recipient / destination fingerprint / channel  
- shipped limits (1/1/1, manual only, retries false)  

## Phrases

| Action | Phrase |
|--------|--------|
| Authorize | `AUTHORIZE ONE LIVE TEST` |
| Launch | `SEND ONE CONTROLLED TEST` |

Store phrase hash / confirmation record — not unnecessary raw phrase copies.

## Lifecycle

`DRAFT` → `AUTHORIZED` → `CONSUMED` | `REVOKED` | `EXPIRED` | `FAILED_CLOSED`

Consumption is atomic. Consumed authorizations cannot be reused. Retries require a new readiness confirmation and a new authorization.
