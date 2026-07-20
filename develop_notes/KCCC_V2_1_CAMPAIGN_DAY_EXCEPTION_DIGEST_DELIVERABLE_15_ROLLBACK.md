# KCCC V2.1 — Deliverable 15 Rollback

**Companion:** `KCCC_V2_1_CAMPAIGN_DAY_EXCEPTION_DIGEST_DELIVERABLE_15.md`  
**Migration:** `20260720150000_v21_campaign_day_exception_digest`

## Safe rollback (code)

1. Revert feature commit(s) on `main` (or deploy prior known-good Netlify deploy).
2. Keep database tables in place unless Steve explicitly approves destructive SQL.

## Data notes

- `CampaignDayIncidentDigestReview` holds only review metadata + fingerprint — no copied incident narratives.
- `ExternalObjectReference` is empty by design until a future Mobilize/integration deliverable writes rows.
- Dropping tables is **destructive** and not required to restore prior UI behavior.

## Do not

- Delete `MissionIncident*` data when rolling back D15.
- Fabricate or clear sync rows to “reset” Mobilize readiness.
- Force-push `main` without Steve approval.
