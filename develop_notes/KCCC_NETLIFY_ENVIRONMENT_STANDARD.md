# Netlify Environment Standard (KCCC)

## Required runtime secrets

| Variable | Secret | Notes |
| --- | ---: | --- |
| `APP_SESSION_SECRET` | Yes | ≥32 chars; not development default; runtime scopes |
| `DATABASE_URL` | Yes | Pooler/runtime |
| `DIRECT_URL` | Yes | As required for Prisma |

## Required non-secrets

| Variable | Notes |
| --- | --- |
| `ENV_FALLBACK_TO_REDDIRT` | Must be `false` on Netlify |
| `NEXT_PUBLIC_APP_URL` | Production URL |
| `NEXT_PUBLIC_CAMPAIGN_TIMEZONE` | `America/Chicago` |
| `NODE_VERSION` | 20 via `netlify.toml` |

## Proof window (optional, temporary)

| Variable | Notes |
| --- | --- |
| `KCCC_DEPLOYMENT_PROOF_MODE` | `true` only during Step 5.7 proof |
| `KCCC_ALLOW_PRODUCTION_SEED` | Only with proof mode; never default |

Never commit values. Never print values. Do not rotate `APP_SESSION_SECRET` on every build.
