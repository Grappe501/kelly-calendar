# Architecture Decision Register

Machine-readable source: `data/architecture_decisions.json`

## Visibility (ADR-029–035)

Occupied time visible; calendar name; safe titles; location disclosure; server sanitization; layered visibility; primary calendar label.

## Historical import & fast entry (ADR-036–045)

- ADR-036 Historical Calendar Floor (2025-11-01)
- ADR-037 External Events Enter Through Staging
- ADR-038 Public iCal and API Provider Contracts
- ADR-039 External Identity Preservation
- ADR-040 No Blind Historical Claims
- ADR-041 Structured Entry Before Free Text
- ADR-042 Full Operational Plan Per Event
- ADR-043 AI Suggestions Evidence-Based
- ADR-044 Reviewed History Powers Recommendations
- ADR-045 Drafts Are Clearly Non-Live

## Database foundation (ADR-046–057)

- ADR-046 Dedicated PostgreSQL Schema (`kelly_calendar`)
- ADR-047 One Canonical Event
- ADR-048 Command Calendar Is a Roll-Up Surface
- ADR-049 Event Details Are Section-Protected
- ADR-050 Historical Imports Require Approval
- ADR-051 External Identity Is Preserved in Database
- ADR-052 Optimistic Concurrency
- ADR-053 Operational Plans Are Structured Data
- ADR-054 Templates Are Snapshotted
- ADR-055 Audit Records Are Redacted
- ADR-056 Reference Seeds Are Idempotent
- ADR-057 Step 5 Schema Without Step 4 Keeps Mutations Off
