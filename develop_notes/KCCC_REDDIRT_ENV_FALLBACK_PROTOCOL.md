# RedDirt Env Fallback Protocol

- Allowlist only: `DATABASE_URL`, `DIRECT_URL`, `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Server-side only
- Never log file contents or values
- Control: `ENV_FALLBACK_TO_REDDIRT` (default local true, Netlify false)
- Unknown RedDirt keys ignored
