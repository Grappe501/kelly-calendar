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

Phase 1:
CERTIFIED — Campaign Operating System Kernel (0.7.11-ops / tip c36a59e)

Active:
Phase 2.1 Candidate Operations (0.8.0-candidate)
Route: /candidate
Question: Is the candidate prepared for today's engagements?

Doctrine:
Phase 2 capabilities orchestrate Phase 1 services — they do not replace or duplicate them.

Still false:
- candidate_data_ready
- real_candidate_data_enabled
- ai_enabled

Hard rules:
- No deletes / repo moves / template extraction
- No AJAX / PhatLip / countyWorkbench / sos-public / RedDirt src imports
- No real PII in tests; no secrets in docs/chat/commits
- Intelligence interprets; never overrides canonical facts
- Candidate Ops owns almost no primary data

Next after 2.1 ACCEPT:
2.2 Debate & Media → 2.3 Fundraising → 2.4 GOTV → 2.5 Petition & Ballot

Docs:
- develop_notes/KCCC_PHASE_02_CHARTER.md
- develop_notes/KCCC_PHASE_02_1_CANDIDATE_OPERATIONS.md
- develop_notes/KCCC_PHASE_02_ROADMAP.md
- develop_notes/KCCC_PHASE_01_CERTIFICATION.md
```
