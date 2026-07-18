# Authenticated Actor Standard

Actors are resolved only from the server session (`getSessionViewer` → `AuthenticatedActor`).

Never accept `body.userId` / `body.actorUserId` as the acting identity.

Entry points: `getOptionalAuthenticatedActor`, `requireAuthenticatedActor`, `requireActiveAuthenticatedActor`.
