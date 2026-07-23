import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getHealthRun } from "@/server/services/calendar-health-service";

export const metadata: Metadata = { title: "Calendar health run" };
export const dynamic = "force-dynamic";

type Params = Promise<{ runId: string }>;

export default async function CalendarHealthRunDetailPage({
  params,
}: {
  params: Params;
}) {
  const { runId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  const run = await getHealthRun(actor, runId);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Run {run.id.slice(0, 8)}…</h1>
        <p>
          {run.runType} · {run.scope} · {run.status} · {run.overallState}
        </p>
      </header>
      {run.truncated ? (
        <section className="dev-banner" role="status">
          {run.truncationNote ?? "Run truncated at soft limit."}
        </section>
      ) : null}
      <section className="panel">
        <ul className="status-list">
          <li>
            <span>Records examined</span>
            <strong>{run.recordsExamined}</strong>
          </li>
          <li>
            <span>Mandatory</span>
            <strong>
              {run.mandatoryCompleted}/{run.mandatoryExpected} ok ·{" "}
              {run.mandatoryFailed} failed · {run.mandatorySkipped} skipped
            </strong>
          </li>
          <li>
            <span>Config</span>
            <strong>{run.configState ?? "—"}</strong>
          </li>
          <li>
            <span>Detector</span>
            <strong>{run.detectorVersion}</strong>
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2>Findings</h2>
        <ul className="plain-list">
          {run.findings.map((f) => (
            <li key={f.id}>
              <Link href={`/system/calendar/health/findings/${f.id}`}>
                [{f.severity}] {f.domain}/{f.findingType} — {f.summary}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Link className="button secondary" href="/system/calendar/health">
        Health dashboard
      </Link>
    </div>
  );
}
