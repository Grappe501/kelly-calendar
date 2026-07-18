# KCCC Step 5.7 — Netlify Auth and Live Mutation Proof

**Script ID:** `KCCC-STEP-05.7-NETLIFY-AUTH-AND-LIVE-MUTATION-PROOF`  
**Status:** BLOCKED — OPERATOR ACTION REQUIRED  
**Deploy tip:** `83c2bd4` (or later tip containing it)  
**Prerequisite:** Step 5.6 complete  
**Next after pass:** `KCCC-STEP-06-MOBILE-COMMAND-SHELL`

## Purpose

Operator deployment and live mutation acceptance gate. Not a product feature build. Not Step 6.

## Required outcomes (all must pass)

1. Set a strong production `APP_SESSION_SECRET` in Netlify (32+ chars, not a development default).
2. Confirm the secret is available to all required server functions.
3. Deploy commit `83c2bd4` (or a later tip that includes it without Step 6 work).
4. Confirm anonymous protected pages redirect to `/login`.
5. Confirm anonymous mutation APIs return `401`.
6. Confirm a valid authenticated staging user can create and update a **synthetic** event.
7. Confirm an unauthorized user receives `403`.
8. Confirm stale updates receive `409`.
9. Confirm workflow apply, readiness snapshots, conflicts, approvals, and imports work in the deployed environment.
10. Confirm audit attribution and safe projections.
11. Confirm no real Kelly data is present.
12. Record explicit operator acceptance of the live mutation proof.

## Hard holds

```text
candidate_data_ready: false
real_candidate_data_enabled: false
No autonomous AI / scheduling / staff assignment
No Step 6 mobile shell work in this gate
```

## Operator acceptance record

When complete, record in `develop_notes/KCCC_STEP_05_7_OPERATOR_ACCEPTANCE.md`:

- Deployed commit hash
- Netlify site / deploy URL (no secrets)
- Date/time of proof
- Synthetic users used (emails only; never passwords)
- Checklist items 1–12 marked PASS
- Operator name / sign-off

## Secret handling

- Never commit `APP_SESSION_SECRET`
- Never print the secret in chat, logs, or reports
- Do not generate a new secret on every Netlify build
- Production must fail closed if the secret is missing
