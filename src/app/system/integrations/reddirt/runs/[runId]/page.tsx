import type { Metadata } from "next";
import Link from "next/link";
import { requireSystemAdminPage } from "@/lib/system/require-system-admin";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getRedDirtRun } from "@/server/services/reddirt-integration-service";
import { RedDirtRunApplyPanel } from "@/components/integrations/RedDirtRunApplyPanel";

export const metadata: Metadata = { title: "RedDirt run detail" };
export const dynamic = "force-dynamic";

export default async function RedDirtRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  await requireSystemAdminPage(`/system/integrations/reddirt/runs/${runId}`);
  const actor = await requireActiveAuthenticatedActor();
  const run = await getRedDirtRun(actor, runId);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Run {run.id}</h1>
        <p>
          {run.mode} · {run.status} · scope {run.objectScope}
        </p>
      </header>
      <section className="panel">
        <ul className="plain-list">
          <li>Started: {run.startedAt}</li>
          <li>Completed: {run.completedAt ?? "—"}</li>
          <li>Examined: {run.remoteExaminedCount}</li>
          <li>Proposed creates: {run.createsProposed}</li>
          <li>Applied creates: {run.createsApplied}</li>
          <li>Conflicts: {run.conflictCount}</li>
          <li>Skipped: {run.skippedCount}</li>
          <li>Adapter: {run.adapterVersion}</li>
          <li>Docs revision: {run.documentationRevision}</li>
          <li>{run.diagnosticSummary}</li>
        </ul>
      </section>
      <section className="panel">
        <h2>Candidates</h2>
        <ul className="plain-list">
          {run.candidates.map((c) => (
            <li key={c.id}>
              {c.externalObjectId} · {c.action} · {c.disposition} ·{" "}
              {c.proposedLocalObjectType ?? "—"} / {c.proposedLocalObjectId ?? "—"}
            </li>
          ))}
        </ul>
      </section>
      <RedDirtRunApplyPanel
        runId={run.id}
        candidateIds={run.candidates
          .filter(
            (c) =>
              c.disposition === "PENDING" || c.disposition === "APPROVED",
          )
          .map((c) => c.id)}
      />
      <Link className="button secondary" href="/system/integrations/reddirt/runs">
        Back to runs
      </Link>
    </div>
  );
}
