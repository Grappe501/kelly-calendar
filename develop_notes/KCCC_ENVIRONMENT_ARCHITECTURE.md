# Environment Architecture

## Precedence

1. Existing `process.env` (never overwritten)
2. `kelly-calendar/.env.local`
3. `kelly-calendar/.env`
4. `RedDirt/.env.local` (approved keys only, if fallback enabled)
5. `RedDirt/.env` (approved keys only, if fallback enabled)

## Production

Netlify injects variables. Filesystem RedDirt fallback is disabled under `NETLIFY` / `CI`.

## Schemas

- Public: `getPublicEnvironment()`
- Server: `getServerEnvironment()` via `server-only` loader
