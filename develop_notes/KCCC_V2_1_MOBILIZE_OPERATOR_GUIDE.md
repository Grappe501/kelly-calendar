# KCCC — Mobilize operator guide (D16)

## Configure (Netlify / server)

1. In Netlify Site settings → Environment variables, set:
   - `MOBILIZE_API_KEY` (secret)
   - `MOBILIZE_ORGANIZATION_ID` (numeric org id as string)
   - Optional: `MOBILIZE_IMPORT_EVENTS_ENABLED=true` to mark event import capability application-enabled after verify
2. Do **not** set `NEXT_PUBLIC_MOBILIZE_API_KEY`.
3. Redeploy after env changes.

## Verify connection

1. Open `/system/integrations/mobilize` as Kelly or Campaign Manager.
2. Confirm “API key: configured” / “Organization ID: configured” (values never shown).
3. Click **Verify connection**.
4. Expect `CONNECTED` or `DEGRADED` when credentials work; `NOT_CONFIGURED` / `INVALID_CREDENTIALS` otherwise.

## Dry-run reconciliation

1. Click **Start event dry-run** (or use API `POST /api/integrations/mobilize/dry-run`).
2. Open **Sync runs** → select the run.
3. Review candidates (`NEW_REMOTE`, `REMOTE_CHANGED`, `REMOTE_DELETED`, `AMBIGUOUS_MATCH`, …).
4. Title-only matches are `AMBIGUOUS_MATCH` and never auto-apply.

## Explicit apply

1. Select eligible candidates on the run detail page.
2. Click **Apply selected** — registers `ExternalObjectReference` only.
3. Does **not** create Missions or complete Execute/attendance.

## Outbound publishing (D17)

Preview/approve at `/system/integrations/mobilize/publishing`. Network create/update require credentials plus `MOBILIZE_PUBLISHING_ENABLED` / `MOBILIZE_UPDATES_ENABLED`. See `KCCC_V2_1_MOBILIZE_PUBLISHING_OPERATOR_GUIDE.md`. Delete remains disabled. Do not probe write endpoints during verify.
