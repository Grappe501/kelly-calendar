import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const actor = await requireSystemAdminPage("/system/audit");

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">Engineering validation</p>
        <h1>Audit attribution</h1>
        <p className="muted">
          Meaningful writes record actorUserId, session reference, requestId,
          action, entity, and safe before/after projections. Secrets are never
          stored in audit payloads.
        </p>
      </header>

      <section className="panel">
        <h2>Current actor attribution fields</h2>
        <ul>
          <li>actorUserId: {actor.userId}</li>
          <li>actorSessionId: {actor.sessionId}</li>
          <li>displayName: {actor.displayName}</li>
          <li>role: {actor.primarySystemRole}</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Never audited</h2>
        <ul>
          <li>Raw session cookie / token</li>
          <li>Password or password hash</li>
          <li>APP_SESSION_SECRET</li>
          <li>DATABASE_URL / DIRECT_URL</li>
          <li>Private calendar URLs</li>
          <li>Authorization headers</li>
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
