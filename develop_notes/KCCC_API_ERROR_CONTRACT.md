# API Error Contract

```json
{ "ok": false, "error": { "code": "...", "message": "...", "requestId": "..." } }
```

Codes: `AUTHENTICATION_REQUIRED` (401), `PERMISSION_DENIED` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (400), `CONFLICT` (409), `NOT_IMPLEMENTED` (501).

No stack traces, SQL, cookies, or secrets in responses.
