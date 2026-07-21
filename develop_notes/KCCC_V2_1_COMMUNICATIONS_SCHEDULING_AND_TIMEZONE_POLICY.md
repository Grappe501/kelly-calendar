# KCCC — Scheduling & timezone policy (D25)

- Store instants in UTC; retain IANA timezone on campaign/plan.
- Reject unrecognized timezones.
- Start must precede end; invalid daily windows fail closed.
- Blackout / emergency hold exceptions block new work.
- Ambiguous DST local times are not invented — use UTC instants.
