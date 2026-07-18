# Canonical Event Model

One real-world commitment → one `Event` row → one primary calendar → zero or more related calendar memberships.

Human-readable `eventNumber` (e.g. `KCCC-2026-000123`) is unique and not the primary key. Optimistic concurrency uses `version`.
