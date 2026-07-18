# Secret Handling Protocol

- Never `NEXT_PUBLIC_*` for server secrets
- Redact via `redactForLog` / `redactDatabaseUrl`
- Client bundle scan: `npm run security:bundle`
- Safe errors never include stacks/secrets in production responses
