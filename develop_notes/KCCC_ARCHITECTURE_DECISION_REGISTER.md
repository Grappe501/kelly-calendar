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

## Operational intelligence (ADR-058–067)

- ADR-058 Operational Intelligence Precedes Final UI
- ADR-059 Deterministic Rules Before AI
- ADR-060 Workflow Applications Are Versioned
- ADR-061 Readiness Is Explainable
- ADR-062 Critical Blockers Override Numeric Scores
- ADR-063 Suggestions Require Human Approval
- ADR-064 Historical Patterns Use Reviewed Evidence
- ADR-065 Conflicts Are Advisory
- ADR-066 Readiness and Completion Are Separate
- ADR-067 Command Summaries Are Permission-Filtered

## Authenticated operations unlock (ADR-068–074)

Burt script IDs ADR-061–067 for this unlock collide with Step 5.5; repository uses ADR-068–074:

- ADR-068 Authenticated Actor Comes Only From the Server Session
- ADR-069 Authorization Is Action-Based
- ADR-070 Authentication and Authorization Are Separate
- ADR-071 Mutation Responses Use Safe Projections
- ADR-072 Operational Intelligence Applies Through Ordinary Mutations
- ADR-073 Candidate Data Remains Disabled After Technical Unlock
- ADR-074 Netlify Fails Closed Without Session Secret

## Deployment proof (ADR-075–080)

Burt Step 5.7 ADR labels 068–073 map here to avoid collisions:

- ADR-075 Production Authentication Requires an Explicit Runtime Secret
- ADR-076 Deployment Proof Uses Synthetic Data Only
- ADR-077 Proof Mode Cannot Bypass Security
- ADR-078 Operator Acceptance Is a Separate Gate
- ADR-079 Step 6 Depends on Deployed Mutation Proof
- ADR-080 Proof Records Must Be Isolated
