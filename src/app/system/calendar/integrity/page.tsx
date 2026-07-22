import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getIntegritySummary, listIntegrityScans } from "@/server/services/calendar-integrity-service";
import { IntegrityScanControls } from "@/components/calendar/IntegrityScanControls";
import { CALENDAR_INTEGRITY_DETECTOR_VERSION } from "@/lib/calendar/integrity/types";

export const metadata: Metadata = { title: "Calendar integrity" };
export const dynamic = "force-dynamic";

export default async function CalendarIntegrityPage() {
  const actor = await requireActiveAuthenticatedActor();
  const summary = await getIntegritySummary(actor);
  const scans = await listIntegrityScans(actor, 10);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Calendar integrity & provenance</h1>
        <p>
          CC-02 trust surface: duplicates, provenance gaps, import anomalies, drift, and lifecycle
          warnings. Detection only — no automatic Event or Mission mutation.
        </p>
      </header>

      <section className="dev-banner" role="status">
        Detector {CALENDAR_INTEGRITY_DETECTOR_VERSION}. Page load does not start a scan.
        {"schemaReady" in summary && summary.schemaReady === false
          ? " Integrity tables are not applied yet — scans unavailable until migration."
          : null}
      </section>

      <section className="panel">
        <h2>Start a bounded scan</h2>
        <IntegrityScanControls />
      </section>

      <section className="panel">
        <h2>Latest scan</h2>
        {summary.latestScan ? (
          <ul className="status-list">
            <li>
              <span>Status</span>
              <strong>{summary.latestScan.status}</strong>
            </li>
            <li>
              <span>Scope</span>
              <strong>{summary.latestScan.scope}</strong>
            </li>
            <li>
              <span>Events examined</span>
              <strong>{summary.latestScan.eventsExamined}</strong>
            </li>
            <li>
              <span>Findings</span>
              <strong>{summary.latestScan.findingsTotal}</strong>
            </li>
            <li>
              <span>Truncated</span>
              <strong>{summary.latestScan.truncated ? "yes" : "no"}</strong>
            </li>
          </ul>
        ) : (
          <p className="muted">No scans yet.</p>
        )}
        {summary.latestScan ? (
          <Link
            className="button"
            href={`/system/calendar/integrity/scans/${summary.latestScan.id}`}
          >
            Open latest scan
          </Link>
        ) : null}
      </section>

      <section className="panel">
        <h2>Recent scans</h2>
        <ul className="plain-list">
          {scans.map((s) => (
            <li key={s.id}>
              <Link href={`/system/calendar/integrity/scans/${s.id}`}>
                {s.startedAt.toISOString()} · {s.scope} · {s.findingsTotal} findings · {s.status}
              </Link>
            </li>
          ))}
        </ul>
        <Link className="button secondary" href="/system/calendar/integrity/scans">
          All scans
        </Link>
      </section>

      <section className="panel">
        <div className="button-row">
          <Link className="button secondary" href="/calendar">
            Calendar
          </Link>
          <Link className="button secondary" href="/import/google-calendar/apply">
            Import apply
          </Link>
          <Link className="button secondary" href="/system/imports">
            System imports
          </Link>
          <Link className="button secondary" href="/upload">
            Upload
          </Link>
          <Link className="button secondary" href="/api/calendar/integrity/export">
            Diagnostic export
          </Link>
        </div>
      </section>
    </div>
  );
}
