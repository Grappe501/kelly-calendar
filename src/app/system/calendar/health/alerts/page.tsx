import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listAlerts } from "@/server/services/calendar-health-service";
import { HealthAcknowledgeButton } from "@/components/calendar/HealthAcknowledgeButton";

export const metadata: Metadata = { title: "Calendar health alerts" };
export const dynamic = "force-dynamic";

export default async function CalendarHealthAlertsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const alerts = await listAlerts(actor, { limit: 60 });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Health alerts</h1>
        <p className="muted">
          Acknowledge does not resolve. Alerts reopen when findings return after resolve.
        </p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/health">
            Dashboard
          </Link>
        </p>
      </header>
      <section className="panel">
        {alerts.length === 0 ? (
          <p className="muted">No alerts.</p>
        ) : (
          <ul className="plain-list">
            {alerts.map((a) => (
              <li key={a.id}>
                <div>
                  [{a.severity}] {a.status} — {a.summary}
                </div>
                <p className="muted">
                  {a.findingKey} · last {a.lastTriggeredAt.toISOString()}
                </p>
                {a.status === "OPEN" ? (
                  <HealthAcknowledgeButton alertId={a.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
