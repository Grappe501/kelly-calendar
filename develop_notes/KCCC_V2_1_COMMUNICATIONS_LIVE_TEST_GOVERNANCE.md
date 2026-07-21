# KCCC — Live-test governance (D26)

D26 authorizes **one specific controlled test**, not production messaging.

## Separation of duties (minimum)

| Role | Action |
|------|--------|
| Preparer | Creates program / revision / recipient draft |
| Reviewer | Approves readiness |
| Authorizer | Creates one-time authorization (`AUTHORIZE ONE LIVE TEST`) |
| Launch operator | Manual launch (`SEND ONE CONTROLLED TEST`) |

Self-approval must be surfaced, never hidden.

## Hard prohibitions

- Audience-manifest live dispatch  
- Scheduled / cron / Netlify scheduled live launch  
- Automatic retries or follow-ups  
- Multiple approved recipients (initial ship)  
- General `communications.production.send`  
- Converting D25 campaigns into production via live-test controls  

## Consent scope

`COMMUNICATIONS_CONTROLLED_LIVE_TEST` — general campaign contact permission does not automatically authorize the engineering live test.
