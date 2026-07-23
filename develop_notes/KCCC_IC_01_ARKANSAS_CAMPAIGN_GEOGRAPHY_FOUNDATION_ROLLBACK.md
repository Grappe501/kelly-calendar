# IC-01 Rollback — Arkansas Campaign Geography Foundation

Non-destructive · manual only · never mutates Event/Mission schedules.

## Order of operations

1. **Stop operator apply** — hide or feature-flag `/system/geography/reconciliation` and deny `POST /api/geography/reconciliation/apply` (preview may remain read-only).
2. **Preserve authority rows** — keep `ArkansasCounty`, `GeographyPlaceAuthority`, `GeographyPlaceCounty`, `GeographyAlias`, regions, corridors, priorities, focus areas, and `GeographySource` rows. Do not truncate for convenience.
3. **Preserve geography links** — keep historical `EventGeography` / `MissionGeography` (including superseded). Soft-deactivate (`isActive=false`) only if explicitly approved; never cascade-delete Events or Missions.
4. **No schedule mutation** — rollback never deletes, rewrites, or reschedules `Event` / `CampaignMission` fields (`startsAt`, `endsAt`, status, title, city, venue, notes).
5. **Seed/import ledger** — retain `GeographyImportRun` and reconciliation candidate history for audit.
6. **Schema revert** only when geography tables are unused, empty of operator-critical links, and explicitly approved. Never drop core `Event` / `CampaignMission` / CC-07…CC-12 tables.
7. **Constants** — set `IC_01_STATUS` back only under a new ADR; do not silently reopen IC-02.

## What rollback does *not* undo

- Census planning JSON under `data/geography/` (versioned source artifacts)
- ADR-101 / ADR-102 / ADR-103 governance docs
- CC-07 `countyIds` query contract (independent of EventGeography)

## Re-enable

Re-seed with `npm run geography:foundation:seed` (idempotent), re-run `npm run geography:foundation:validate`, and restore UI/API access under leadership auth.
