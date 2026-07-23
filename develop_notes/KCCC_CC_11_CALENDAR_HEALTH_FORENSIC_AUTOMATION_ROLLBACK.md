# CC-11 Rollback

Non-destructive · manual only.

1. **Disable scheduled ingress** — remove or rotate `CALENDAR_HEALTH_SCHEDULER_SECRET` / gate `/api/internal/calendar/health/` so scheduled runs stop; remove path from public-path allowlist if needed.
2. **Stop manual runs** — hide or feature-flag `/system/calendar/health` start-run UI and `POST /api/calendar/health/runs`.
3. **Preserve history** — keep `CalendarHealthRun`, `CalendarHealthFinding`, `CalendarHealthAlert`, and `CalendarHealthCheckpoint` rows; do not truncate for convenience.
4. **No schedule mutation** — health rollback never deletes or rewrites Events, Missions, conflicts, availability, recurrence, or ICS feeds.
5. **CC-02 / CC-10 untouched** — integrity dispositions and subscription rotate/revoke remain operator-owned; do not cascade-delete those tables.
6. **Schema revert** only when health tables are empty/unused and explicitly approved; never drop `Event` / `CampaignMission` or unrelated CC-09/CC-10 tables.
