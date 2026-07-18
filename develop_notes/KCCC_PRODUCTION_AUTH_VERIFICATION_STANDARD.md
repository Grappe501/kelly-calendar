# Production Auth Verification Standard

1. Missing/invalid `APP_SESSION_SECRET` → fail closed (no session issuance).
2. Anonymous protected pages → redirect `/login`.
3. Anonymous protected APIs → `401`.
4. Unauthorized authenticated actors → `403`.
5. Stale `expectedVersion` → `409`.
6. Cookie: HTTP-only; Secure on HTTPS; SameSite configured.
7. Logout revokes access.
8. No raw tokens in JSON, logs, or audit.
