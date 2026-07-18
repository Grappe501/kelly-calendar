# Workflow Apply Auth Protocol

- Preview (`POST .../workflow/preview`) remains nonmutating and requires `WORKFLOW_PREVIEW`.
- Apply (`POST .../workflow/apply`) requires authenticated actor, `WORKFLOW_APPLY`, event edit authorization, matching workflow version, server-side preview recalculation, duplicate detection, transactional selected-item application, `EventWorkflowApplication` persistence, event version increment, audit, readiness/conflict refresh.
- Client-proposed generated values are never trusted without server recalculation.
- Stale `expectedEventVersion` → 409.
