import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Step56Page() {
  const actor = await requireActiveAuthenticatedActor().catch(() => null);
  if (!actor) redirect("/login?next=/system/step-5-6");
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    return (
      <div className="page-stack">
        <h1>Step 5.6</h1>
        <p className="muted">Administrator access required.</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">Engineering validation</p>
        <h1>Step 5.6 — Authenticated operations unlock</h1>
        <p className="muted">
          Not the Step 6 mobile Command Shell. Synthetic data only. Candidate
          production data remains disabled.
        </p>
      </header>

      <section className="panel">
        <h2>Current actor</h2>
        <ul>
          <li>Display name: {actor.displayName}</li>
          <li>Email: {actor.email}</li>
          <li>Role: {actor.primarySystemRole}</li>
          <li>Teams: {actor.teamMemberships.map((t) => t.teamName).join(", ") || "none"}</li>
          <li>Session id: {actor.sessionId}</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Unlocked mutation surfaces</h2>
        <ul>
          <li>POST /api/events — create</li>
          <li>PATCH /api/events/[id] — update</li>
          <li>Archive / restore / calendars / primary calendar</li>
          <li>Plan section PUTs (objectives → travel)</li>
          <li>Workflow preview + apply</li>
          <li>Recommendation decisions</li>
          <li>Readiness recalculate + snapshot</li>
          <li>Conflict acknowledge / override</li>
          <li>Approvals + historical import decisions</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Related validation pages</h2>
        <div className="button-row">
          <Link className="button secondary" href="/system/auth-debug">
            Auth debug
          </Link>
          <Link className="button secondary" href="/system/mutation-test">
            Mutation test
          </Link>
          <Link className="button secondary" href="/system/permissions">
            Permissions
          </Link>
          <Link className="button secondary" href="/system/audit">
            Audit
          </Link>
          <Link className="button secondary" href="/system/step-5-5">
            Step 5.5 OI
          </Link>
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
        </div>
      </section>
    </div>
  );
}
