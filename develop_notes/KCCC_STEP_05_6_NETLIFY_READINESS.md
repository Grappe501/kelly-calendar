# Step 5.6 Netlify Readiness

Required env:

- `APP_SESSION_SECRET` (≥32 chars, not a development default)
- `DATABASE_URL`
- `DIRECT_URL`

Production fails closed without session secret. Synthetic seed users must not auto-run in production. `candidate_data_ready` stays false until a later activation gate.
