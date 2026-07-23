import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listHealthRuns } from "@/server/services/calendar-health-service";

export const metadata: Metadata = { title: "Calendar health runs" };
export const dynamic = "force-dynamic";

export default async function CalendarHealthRunsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const runs = await listHealthRuns(actor, 40);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Health runs</h1>
        <p className="muted">Bounded observe-only forensic runs.</p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/health">
            Dashboard
          </Link>
        </p>
      </header>
      <section className="panel">
        {runs.length === 0 ? (
          <p className="muted">No runs yet.</p>
        ) : (
          <ul className="plain-list">
            {runs.map((r) => (
              <li key={r.id}>
                <Link href={`/system/calendar/health/runs/${r.id}`}>
                  {r.startedAt.toISOString()} · {r.runType} · {r.scope} ·{" "}
                  {r.overallState} · {r.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
