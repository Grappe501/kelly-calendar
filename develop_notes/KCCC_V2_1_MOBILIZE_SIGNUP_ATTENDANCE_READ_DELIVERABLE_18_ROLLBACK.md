# D18 Rollback — Mobilize Signup/Attendance Read

1. Unset `MOBILIZE_IMPORT_ATTENDANCE_ENABLED`.
2. Remove attendance nav links / revert feature commit if needed.
3. Preserve observation, match, correlation, and audit history.
4. Do not auto-export or bulk-delete PII; anonymize only under operator policy.
5. Person/attendance **writes** to Mobilize remain disabled (unchanged from D17).
6. Database rollback of D18 tables only when unused and safe.
7. Restore D17 publishing behavior with attendance routes disabled.
