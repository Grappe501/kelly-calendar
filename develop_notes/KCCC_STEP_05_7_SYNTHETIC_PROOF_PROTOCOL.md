# Step 5.7 Synthetic Proof Protocol

Use only synthetic identities and an isolated **KCCC Deployment Proof** calendar.

Suggested staging emails (app credentials, not email delivery):

- `operator.kccc.staging@example.invalid` (ADMINISTER)
- `manager.kccc.staging@example.invalid`
- `viewer.kccc.staging@example.invalid`

Proof event example title: `KCCC Step 5.7 Synthetic Mutation Proof`.

Rules:

- Create through deployed authenticated API (not SQL)
- Mark synthetic / proofStep metadata where schema allows
- Exclude from candidate workload, county coverage, public surfaces, Google sync
- Never assert Kelly attendance
- Keep `candidate_data_ready: false`
