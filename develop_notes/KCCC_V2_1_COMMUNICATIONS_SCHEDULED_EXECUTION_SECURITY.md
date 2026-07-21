# KCCC — Scheduled execution security (D25)

`POST /api/internal/communications/scheduled-execution`

- Requires `KCCC_SCHEDULED_EXECUTION_SECRET` header match  
- Fail closed if unset/mismatched  
- Rejects PRODUCTION mode and destination overrides  
- Processes at most one bounded sandbox batch per invocation (future wire-up)  
- Never accepts arbitrary campaign configuration payloads that bypass authorization  
