import type { Metadata } from "next";
import Link from "next/link";
import { listImportManifests } from "@/features/calendar-import/staging-store";

export const metadata: Metadata = {
  title: "Import history",
};

export const dynamic = "force-dynamic";

export default function ImportHistoryPage() {
  const runs = listImportManifests();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Import history</h1>
        <p>Manifests only — source URLs are never stored here.</p>
      </header>

      <section className="panel">
        {runs.length === 0 ? (
          <p className="muted">No import runs yet.</p>
        ) : (
          <ul className="status-list">
            {runs.map((run) => (
              <li key={run.importId}>
                <span>
                  {run.importId}
                  <br />
                  <span className="muted">
                    {run.sourceLabel} · {run.status} · floor range{" "}
                    {run.requestedRange.startsAt.slice(0, 10)} →{" "}
                    {run.requestedRange.endsAt.slice(0, 10)}
                  </span>
                </span>
                <strong>
                  {run.counts.staged}/{run.counts.normalized}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <Link className="button secondary" href="/import/google-calendar">
          Back to import
        </Link>
      </section>
    </div>
  );
}
