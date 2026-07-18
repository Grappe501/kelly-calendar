# KCCC Approval and Audit Model

Canonical doc (alias of audit/approval doctrine). Machine schema: `ApprovalRequest`, `ApprovalAction`, `AuditLog`, `DataAccessLog` (sensitive access) in `kelly_calendar`.

## Approval types

EVENT_CONFIRMATION, PUBLICATION, CANDIDATE_APPROVAL, TRAVEL_APPROVAL, FUNDRAISING_APPROVAL, COMPLIANCE_APPROVAL, PUBLIC_VISIBILITY, IMPORT_APPROVAL, CANCELLATION, MAJOR_TIME_CHANGE

## Audit rules

- Append-oriented
- Central redaction via `redactAuditPayload`
- Never store passwords, tokens, cookies, DB URLs, private calendar URLs, unredacted private notes
- Request ID preserved when available

## Sensitive access log

`DataAccessLog` records high-sensitivity section access only (fundraising, protected personal, exact location, security, travel confirmations, sensitive files).

Live writes remain mutation-gated until Step 4 AUTH-RBAC.
