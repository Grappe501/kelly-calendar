import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getHealthScheduleStatus } from "@/server/services/calendar-health-service";

export const metadata: Metadata = { title: "Calendar health schedule" };
export const dynamic = "force-dynamic";

export default async function CalendarHealthSchedulePage() {
  const actor = await requireActiveAuthenticatedActor();
  const status = await getHealthScheduleStatus(actor);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Health schedule</h1>
        <p className="muted">
          Foundation for Netlify scheduled HTTP invoke of the internal ingress.
          Observe/explain only — never mutates Events.
        </p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/health">
            Dashboard
          </Link>
        </p>
      </header>

      <section className="panel">
        <h2>Configuration</h2>
        <ul className="status-list">
          <li>
            <span>Config state</span>
            <strong>{status.configState}</strong>
          </li>
          <li>
            <span>Schedule secret</span>
            <strong>
              {status.scheduleSecretConfigured ? "configured" : "NOT_CONFIGURED"}
            </strong>
          </li>
          <li>
            <span>Database</span>
            <strong>
              {status.databaseConfigured ? "configured" : "MISSING_DATABASE"}
            </strong>
          </li>
          <li>
            <span>Ingress</span>
            <strong>{status.intendedIngress}</strong>
          </li>
        </ul>
        <p className="muted">{status.note}</p>
        <p className="muted">
          Optional env: <code>KCCC_CALENDAR_HEALTH_SCHEDULE_SECRET</code> (or reuse{" "}
          <code>KCCC_SCHEDULED_EXECUTION_SECRET</code>). Header:{" "}
          <code>x-kccc-calendar-health-secret</code>.
        </p>
      </section>

      <section className="panel">
        <h2>Checkpoints</h2>
        {status.checkpoints.length === 0 ? (
          <p className="muted">No checkpoints yet.</p>
        ) : (
          <ul className="plain-list">
            {status.checkpoints.map((c) => (
              <li key={c.id}>
                {c.checkpointKey} · attempted {c.lastAttemptedRunId ?? "—"} ·
                successful {c.lastSuccessfulRunId ?? "—"} · failures{" "}
                {c.consecutiveFailures}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Recent scheduled runs</h2>
        {status.recentScheduled.length === 0 ? (
          <p className="muted">No scheduled runs yet.</p>
        ) : (
          <ul className="plain-list">
            {status.recentScheduled.map((r) => (
              <li key={r.id}>
                <Link href={`/system/calendar/health/runs/${r.id}`}>
                  {r.startedAt.toISOString()} · {r.overallState} · {r.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
