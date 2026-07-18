# Deployment Environment Checklist (Netlify)

| Variable | Required by |
|----------|-------------|
| `NEXT_PUBLIC_APP_NAME` | Step 2+ |
| `NEXT_PUBLIC_APP_URL` | Step 2+ |
| `NEXT_PUBLIC_CAMPAIGN_TIMEZONE` | Step 2+ |
| `NEXT_PUBLIC_ELECTION_DATE` | Step 2+ |
| `DATABASE_URL` | Step 3 diagnose / Step 5+ |
| `DIRECT_URL` | Step 5 migrations |
| `NEXT_PUBLIC_SUPABASE_*` | Step 4 |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 4 server |
| `OPENAI_API_KEY` | Step 16 (disabled until then) |
| `APP_SESSION_SECRET` | Step 4 |
| `INTERNAL_API_SECRET` | later APIs |
| `LOG_LEVEL` | Step 3 |
| `ENV_FALLBACK_TO_REDDIRT=false` | Netlify production |

No secrets in `netlify.toml`.
