# D19 Rollback — Volunteer Staffing and Assignment Reconciliation

1. Disable staffing routes and navigation links (Mission workspace, day board, report, cross-links from Launch/Briefing/Closeout).
2. Stop staffing mutations at the API layer (return 503 or feature-disabled as implemented).
3. **Preserve** all `MissionStaffingPlan`, `MissionStaffingRequirement`, `MissionStaffingAssignment`, and `MissionStaffingAcknowledgement` history and attributed audit rows.
4. Do **not** auto-export or bulk-delete assignment contact hints or scoped labels; anonymize only under operator policy.
5. Do **not** automate destructive database rollback of D19 tables while operational history exists.
6. Manual DB rollback of D19 schema only when tables are unused, backed up, and explicitly authorized — never as part of routine deploy rollback.
7. Restore D18 Mobilize attendance read behavior unchanged; D18 observations remain available for future staffing re-enable.
8. Person/attendance **writes** to Mobilize remain disabled (unchanged from D17/D18).
9. Revert feature commit if needed after routes are disabled; do not delete staffing rows as part of git revert.

**Principle:** Disable surfaces and writes; keep operational history. Staffing assignments are operator decisions — rollback must not silently erase them.
