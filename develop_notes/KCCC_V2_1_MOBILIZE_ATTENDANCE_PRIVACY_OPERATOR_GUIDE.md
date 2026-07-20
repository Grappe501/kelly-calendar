# KCCC — Mobilize attendance privacy & reconciliation operator guide (D18)

## Principles

1. Signup ≠ attendance ≠ local check-in ≠ Mission Execute.
2. Page loads do not sync.
3. Custom signup values and referrers are never stored.
4. Person-level apply is disabled until a consent-aware Person authority exists.

## Workflow

1. Ensure D16 external Event reference exists (never title-only).
2. Enable `MOBILIZE_IMPORT_ATTENDANCE_ENABLED` only when credentials are ready.
3. `/system/integrations/mobilize/attendance` → enter Mobilize event id → dry-run.
4. Review separated aggregate counts.
5. Explicit aggregate apply upserts observations (no people created).
6. Person matches: propose / reject / do-not-link only.
7. Check-in correlation: explicit POST with Mission + observation + local Field Ops/check-in id.

## Privacy

- Broad ops views show aggregates only.
- Contact details are not shown.
- No consent is inferred from Mobilize `sms_opt_in_status` or signup.

## Campaign communications (D20)

D20 outreach planning uses **documented consent evidence** per channel and purpose — not D18 observations:

1. Mobilize signup/attendance aggregates cannot become person-level communication audience members.
2. Person match status (`CONFIRMED` / `DO_NOT_LINK` / `AMBIGUOUS`) gates external-person eligibility when linked.
3. Mobilize event URLs may appear in message **content** with verified local references — not sent through Mobilize.
4. External email/SMS dispatch is disabled in D20; export and manual handoff only.

See `KCCC_V2_1_CAMPAIGN_COMMUNICATIONS_OPERATOR_GUIDE.md` and `KCCC_V2_1_COMMUNICATION_CONSENT_SUPPRESSION_POLICY.md`.
