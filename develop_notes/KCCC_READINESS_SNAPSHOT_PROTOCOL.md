# Readiness Snapshot Protocol

- `GET /api/events/[eventId]/readiness` → `READINESS_VIEW`
- `POST /api/events/[eventId]/readiness/recalculate` → `READINESS_RECALCULATE`
- Snapshot writes occur server-side (`READINESS_SNAPSHOT_WRITE`), tied to event version and calculation version.
- Repeated recalculation on unchanged state may reuse the latest snapshot.
- Critical blockers remain visible to authorized users; limited users receive safe summaries only.
- Protected missing-information details are omitted without section access.
