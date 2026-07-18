# Import & draft staging (H-drive)

Step 3 staging only. Files written here are **not** live calendar events and are **not** written to PostgreSQL.

- `raw/` — fetched ICS (gitignored)
- `normalized/` — normalized JSONL
- `review/` — operator review queue
- `rejected/` — rejected rows
- `reports/` — manifests and reports
- `drafts/` — event entry drafts

Never commit source URLs, OAuth tokens, or secrets.
