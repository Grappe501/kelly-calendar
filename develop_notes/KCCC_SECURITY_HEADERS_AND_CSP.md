# Security Headers and CSP

Applied via `src/middleware.ts` and `next.config.ts` headers().

Headers: nosniff, referrer-policy, X-Frame-Options DENY, Permissions-Policy (camera/mic/geo off), COOP, CORP, CSP staged.

CSP staging: `script-src`/`style-src` allow `'unsafe-inline'` for Next.js hydration; nonce path before candidate-data readiness.

Future: maps, Supabase client, file storage connect-src additions.
