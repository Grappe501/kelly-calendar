# Deployed Mutation Proof Standard

Proof must exercise the real production path:

```text
session → actor → authorize → validate → version → transaction → audit → refresh → safe projection
```

Required mutation classes: event create/update, plan sections, workflow apply, recommendation decisions, readiness recalculate, conflict ack/override, approvals, import decisions.

Synthetic data only. No security bypass flags.
