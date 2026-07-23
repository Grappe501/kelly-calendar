# CC-10 Rollback

Non-destructive · manual only.

1. **Revoke all feeds** — mark every `CalendarSubscriptionFeed` `REVOKED` (or `DISABLED`); rotate is insufficient alone if old URLs must die immediately.
2. **Disable routes** — remove `/api/calendar/feeds/` from public-path allowlist and/or gate export & subscription APIs/UI with a feature flag so new tokens and downloads stop.
3. **Preserve audit history** — keep `CalendarSubscriptionAccessAudit` and `CalendarExportAudit` rows; do not truncate for convenience.
4. **No recall of downloaded ICS** — clients may retain previously fetched calendars; revocation only stops future fetches.
5. **Preserve Events / Missions** — ICS rollback never deletes or mutates canonical schedule or Mission lifecycle.
6. **Schema revert** only when tables are empty/unused and explicitly approved; never drop `Event` / `CampaignMission` or unrelated CC-09 bulk tables.
