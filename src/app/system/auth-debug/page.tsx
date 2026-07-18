import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const dynamic = "force-dynamic";

export default async function AuthDebugPage() {
  const actor = await requireSystemAdminPage("/system/auth-debug");

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">Engineering validation</p>
        <h1>Auth debug</h1>
        <p className="muted">
          Session-derived actor only. Tokens, secrets, and cookie values are never
          shown.
        </p>
      </header>

      <section className="panel">
        <h2>Resolved actor</h2>
        <ul>
          <li>User id: {actor.userId}</li>
          <li>Display name: {actor.displayName}</li>
          <li>Email: {actor.email}</li>
          <li>Active: {actor.isActive ? "yes" : "no"}</li>
          <li>Primary role: {actor.primarySystemRole}</li>
          <li>System roles: {actor.systemRoles.join(", ") || "none"}</li>
          <li>Session id: {actor.sessionId}</li>
          <li>Token id (opaque ref): {actor.tokenId}</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Teams</h2>
        <ul>
          {actor.teamMemberships.length === 0 ? (
            <li>No team memberships</li>
          ) : (
            actor.teamMemberships.map((m) => (
              <li key={m.teamId}>
                {m.teamName} ({m.role ?? "member"}) —{" "}
                {m.active ? "active" : "inactive"}
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="button-row">
        <Link className="button secondary" href="/system/step-5-6">
          Step 5.6
        </Link>
      </div>
    </div>
  );
}
