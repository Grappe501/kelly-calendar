# KCCC New Thread Handoff

```text
Product:
Kelly Campaign Command Calendar (Campaign Operating System)

Workspace:
H:\SOSWebsite\Kelly-calendar

GitHub:
https://github.com/Grappe501/kelly-calendar (main)

Production:
https://kelly-calendar.netlify.app

Owned schema:
kelly_calendar only (shared RedDirt Postgres — no RedDirt source imports)

Phase status:
PHASE 1 CERTIFIED — PRODUCTION READY (0.7.11-ops)

Canonical modules (all ACCEPTED):
Calendar · Executive Command · Field · County · Volunteer · Communications
Logistics · Finance & Resources · Compliance · Voter & Constituent · Intelligence

Step 7 tip (constituents):
d13e798

Still false:
- candidate_data_ready
- real_candidate_data_enabled
- ai_enabled (advisory hooks exist; not autonomously enabled)

Hard rules:
- No deletes / repo moves / template extraction
- No AJAX / PhatLip / countyWorkbench / sos-public / RedDirt src imports
- No real PII in tests; no secrets in docs/chat/commits
- Intelligence interprets; never overrides canonical facts
- Not a CRM / voter-file warehouse / reporting engine

Do NOT continue as Step 7.11.

Operator next:
Pick one Phase 2 workstream from develop_notes/KCCC_PHASE_02_ROADMAP.md
(Candidate Ops · Fundraising Ops · GOTV · Debate & Media · Petition & Ballot)

Docs:
- develop_notes/KCCC_PHASE_01_CERTIFICATION.md
- develop_notes/KCCC_PHASE_02_ROADMAP.md
- develop_notes/KCCC_STEP_07_CAMPAIGN_OPERATIONS_CHARTER.md
```
