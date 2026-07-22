import type { Metadata } from "next";
import Link from "next/link";
import { getImportStatusSummary } from "@/features/calendar-import/staging-store";
import { googleCalendarApiProvider } from "@/features/calendar-import/providers/google-calendar-api";

export const metadata: Metadata = {
  title: "Import system status",
};

export const dynamic = "force-dynamic";

export default function SystemImportsPage() {
  const summary = getImportStatusSummary();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Imports</h1>
        <p>Historical Google Calendar ingestion status. Source secrets are never shown.</p>
      </header>

      <section className="panel">
        <ul className="status-list">
          <li>
            <span>Historical floor</span>
            <strong>{summary.historicalFloor}</strong>
          </li>
          <li>
            <span>Database canonical apply (CC-01)</span>
            <strong>enabled</strong>
          </li>
          <li>
            <span>Filesystem staging writes</span>
            <strong>staging only</strong>
          </li>
          <li>
            <span>Live sync / Google write-back</span>
            <strong>disabled (IMPORT_ONLY)</strong>
          </li>
          <li>
            <span>Import runs</span>
            <strong>{summary.runCount}</strong>
          </li>
          <li>
            <span>Latest status</span>
            <strong>{summary.latestStatus ?? "none"}</strong>
          </li>
          <li>
            <span>API provider</span>
            <strong>{googleCalendarApiProvider.implemented ? "live" : "contract only"}</strong>
          </li>
        </ul>
      </section>

      <section className="panel">
        <div className="button-row">
          <Link className="button" href="/import/google-calendar/apply">
            Open apply queue
          </Link>
          <Link className="button" href="/import/google-calendar">
            Open import panel
          </Link>
          <Link className="button secondary" href="/system/status">
            System status
          </Link>
        </div>
      </section>
    </div>
  );
}
