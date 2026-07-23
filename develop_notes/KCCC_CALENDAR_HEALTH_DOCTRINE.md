# Calendar Health Doctrine (CC-11)

- Health **observes and explains**; it never auto-repairs Events or Missions.
- Runs are bounded (examination caps, finding caps, wall-clock, exclusive lease).
- Truncation and skips must be visible — never silent “HEALTHY”.
- `HEALTHY` requires all mandatory domains completed, zero critical findings, no truncation, config OK.
- Mandatory domain failure → never `HEALTHY` (`UNHEALTHY`).
- Missing database → `UNKNOWN`; missing secret/config → `NOT_CONFIGURED`.
- Findings use stable keys for alert coalescing across runs.
- Integrity: reuse CC-02 detectors as evidence; dispositions stay on the integrity console.
- Conflicts: report `automaticallyResolved=true` as critical; never write that flag.
- ICS: monitor feed counts/status/access outcomes; never rotate or revoke tokens.
- Bulk/jobs: report stuck or failed operations; do not cancel or recover them from health.
- Mission lifecycle is independent — health never creates, advances, or cancels Missions.
- Import: local observation only; no remote write-back.
