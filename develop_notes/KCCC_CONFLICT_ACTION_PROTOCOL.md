# Conflict Action Protocol

- Acknowledge (`POST /api/conflicts/[conflictId]/acknowledge`) means the user has seen the conflict; it does not resolve it.
- Override (`POST /api/conflicts/[conflictId]/override`) requires elevated authorization, reason, actor, timestamp, event version, optional expiration, and audit.
- Critical compliance conflicts are not overrideable by ordinary users.
- No conflict action may automatically move or cancel events.
