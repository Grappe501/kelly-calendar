# Approval Authorization Protocol

| Operation | Route | Action |
| --- | --- | --- |
| Request | `POST /api/events/[eventId]/approvals` | `APPROVAL_REQUEST` |
| Approve | `POST /api/approvals/[approvalId]/approve` | `APPROVAL_RESOLVE` |
| Reject | `POST /api/approvals/[approvalId]/reject` | `APPROVAL_RESOLVE` |
| Request changes | `POST /api/approvals/[approvalId]/request-changes` | `APPROVAL_RESOLVE` |

Requestor and resolver must be authenticated. Resolver must have approval authority. Separation of duties applies where required. History is append-only. Readiness blockers update after resolution. Every action is audited.
