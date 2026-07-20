import type { Metadata } from "next";
import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listMobilizeSyncRuns } from "@/server/services/mobilize-integration-service";

export const metadata: Metadata = {
  title: "Mobilize sync runs",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MobilizeRunsPage() {
  await requireSystemAdminPage("/system/integrations/mobilize/runs");
  const actor = await requireActiveAuthenticatedActor();
  const { runs } = await listMobilizeSyncRuns(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Mobilize sync runs</h1>
        <p>Dry-run and apply audit history. No secrets or raw PII.</p>
      </header>
      <nav className="briefing-nav">
        <Link href="/system/integrations/mobilize">Mobilize</Link>
        <Link href="/system/integrations">Integrations</Link>
      </nav>
      <section className="panel">
        {runs.length === 0 ? (
          <p className="muted">No sync runs yet.</p>
        ) : (
          <ul>
            {runs.map((run) => (
              <li key={run.id}>
                <Link href={`/system/integrations/mobilize/runs/${run.id}`}>
                  {run.id}
                </Link>{" "}
                · {run.mode} · {run.status} · {run.startedAt}
                {run.diagnosticSummary ? ` — ${run.diagnosticSummary}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
