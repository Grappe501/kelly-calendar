import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getHealthDashboard } from "@/server/services/calendar-health-service";
import { HealthStartRunButton } from "@/components/calendar/HealthStartRunButton";
import { CALENDAR_HEALTH_DETECTOR_VERSION } from "@/lib/calendar/health";

export const metadata: Metadata = { title: "Calendar health" };
export const dynamic = "force-dynamic";

export default async function CalendarHealthPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dash = await getHealthDashboard(actor);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Calendar health</h1>
        <p>
          CC-11 forensic dashboard: import, integrity, jobs, ICS, and domain coverage.
          Observe and explain only — no automatic Event or Mission repair.
        </p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/health/runs">
            Runs
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/health/findings">
            Findings
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/health/alerts">
            Alerts
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/health/schedule">
            Schedule
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/integrity">
            Integrity
          </Link>{" "}
          <Link className="chip chip-link" href="/system/calendar/print/preview">
            Print
          </Link>
        </p>
      </header>

      <section className="dev-banner" role="status">
        Detector {CALENDAR_HEALTH_DETECTOR_VERSION}. Overall{" "}
        <strong>{dash.overallState}</strong>
        {dash.stale ? " · stale" : ""}
        {"schemaReady" in dash && dash.schemaReady === false
          ? " · health tables not applied yet"
          : null}
        {dash.configState && dash.configState !== "OK"
          ? ` · config ${dash.configState}`
          : null}
      </section>

      <section className="panel">
        <h2>Start a health run</h2>
        <HealthStartRunButton />
      </section>

      <section className="panel">
        <h2>Latest complete / attempted</h2>
        {dash.latestRun ? (
          <ul className="status-list">
            <li>
              <span>Overall</span>
              <strong>{dash.latestRun.overallState}</strong>
            </li>
            <li>
              <span>Status</span>
              <strong>{dash.latestRun.status}</strong>
            </li>
            <li>
              <span>Scope</span>
              <strong>{dash.latestRun.scope}</strong>
            </li>
            <li>
              <span>Records examined</span>
              <strong>{dash.latestRun.recordsExamined}</strong>
            </li>
            <li>
              <span>Truncated</span>
              <strong>{dash.latestRun.truncated ? "yes" : "no"}</strong>
            </li>
          </ul>
        ) : (
          <p className="muted">No health runs yet.</p>
        )}
        {dash.latestRun ? (
          <Link
            className="button"
            href={`/system/calendar/health/runs/${dash.latestRun.id}`}
          >
            Open latest run
          </Link>
        ) : null}
      </section>

      <section className="panel">
        <h2>Domain cards</h2>
        {dash.domainCards.length === 0 ? (
          <p className="muted">No domain rollup yet.</p>
        ) : (
          <ul className="plain-list">
            {dash.domainCards.map((c) => (
              <li key={c.domain}>
                <Link href={`/system/calendar/health/findings?domain=${c.domain}`}>
                  {c.domain} · {c.findingCount} finding(s)
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Open alerts</h2>
        {dash.openAlerts.length === 0 ? (
          <p className="muted">No open alerts.</p>
        ) : (
          <ul className="plain-list">
            {dash.openAlerts.slice(0, 12).map((a) => (
              <li key={a.id}>
                [{a.severity}] {a.status} — {a.summary}
              </li>
            ))}
          </ul>
        )}
        <Link className="button secondary" href="/system/calendar/health/alerts">
          All alerts
        </Link>
      </section>

      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/api/calendar/health/export">
            Diagnostic export
          </Link>
          <Link className="button secondary" href="/system/calendar/bulk">
            Bulk
          </Link>
          <Link className="button secondary" href="/system/calendar/subscriptions">
            Subscriptions
          </Link>
        </div>
      </section>
    </div>
  );
}
