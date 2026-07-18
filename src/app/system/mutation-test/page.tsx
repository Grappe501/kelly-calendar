import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";

export const dynamic = "force-dynamic";

export default async function MutationTestPage() {
  await requireSystemAdminPage("/system/mutation-test");

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="muted">Engineering validation</p>
        <h1>Mutation test surface</h1>
        <p className="muted">
          Use authenticated API clients against these routes with synthetic data
          only. This is not the Step 6 mobile shell.
        </p>
      </header>

      <section className="panel">
        <h2>Event mutations</h2>
        <ul>
          <li>POST /api/events</li>
          <li>PATCH /api/events/[eventId]</li>
          <li>POST /api/events/[eventId]/archive</li>
          <li>POST /api/events/[eventId]/restore</li>
          <li>POST /api/events/[eventId]/primary-calendar</li>
          <li>POST|DELETE /api/events/[eventId]/calendars</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Operational intelligence mutations</h2>
        <ul>
          <li>POST /api/events/[eventId]/workflow/apply</li>
          <li>POST .../recommendations/[id]/accept|reject|modify|defer</li>
          <li>POST /api/events/[eventId]/readiness/recalculate</li>
          <li>POST /api/conflicts/[conflictId]/acknowledge|override</li>
        </ul>
      </section>

      <div className="button-row">
        <Link className="button secondary" href="/system/step-5-6">
          Step 5.6
        </Link>
        <Link className="button secondary" href="/system/permissions">
          Permissions
        </Link>
      </div>
    </div>
  );
}
