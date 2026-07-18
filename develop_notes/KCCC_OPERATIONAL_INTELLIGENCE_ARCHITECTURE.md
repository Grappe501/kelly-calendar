# Operational Intelligence Architecture

Layer between `kelly_calendar` persistence and UI.

```text
Workflow definitions + rules
        ↓
Preview / calculate / recommend
        ↓
Human approval
        ↓
Transactional mutation services (Step 4+)
        ↓
Safe projections + command summaries
```

Code root: `src/features/operational-intelligence/`

Engines must interpret, calculate, recommend, and warn. They must not confirm invitations, publish, book travel, assign staff without approval, or move events.
