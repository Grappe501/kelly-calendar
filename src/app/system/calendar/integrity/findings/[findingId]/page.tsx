import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getIntegrityFinding } from "@/server/services/calendar-integrity-service";
import { IntegrityDispositionForm } from "@/components/calendar/IntegrityDispositionForm";

export const metadata: Metadata = { title: "Integrity finding" };
export const dynamic = "force-dynamic";

type Params = Promise<{ findingId: string }>;

export default async function IntegrityFindingPage({ params }: { params: Params }) {
  const { findingId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  const finding = await getIntegrityFinding(actor, findingId);
  const evidence = finding.evidenceJson as Record<string, unknown>;

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>{finding.findingType}</h1>
        <p>
          [{finding.severity}] {finding.summary}
        </p>
      </header>
      <section className="panel">
        <ul className="status-list">
          <li>
            <span>State</span>
            <strong>{finding.state}</strong>
          </li>
          <li>
            <span>Finding key</span>
            <strong>{finding.findingKey}</strong>
          </li>
          <li>
            <span>Detection</span>
            <strong>{finding.detectionVersion}</strong>
          </li>
          <li>
            <span>Primary Event</span>
            <strong>
              {finding.primaryEventId ? (
                <Link href={`/events/${finding.primaryEventId}`}>{finding.primaryEventId}</Link>
              ) : (
                "—"
              )}
            </strong>
          </li>
          <li>
            <span>Import record</span>
            <strong>{finding.importRecordId ?? "—"}</strong>
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2>Structured evidence</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </section>
      <section className="panel">
        <h2>Disposition</h2>
        <p className="muted">
          Dispositions never mutate Events or Missions. ACKNOWLEDGED keeps the finding active.
        </p>
        <IntegrityDispositionForm findingId={finding.id} currentState={finding.state} />
      </section>
      <section className="panel">
        <h2>Disposition history</h2>
        <ul className="plain-list">
          {finding.dispositions.map((d) => (
            <li key={d.id}>
              {d.createdAt.toISOString()} · {d.disposition}
              {d.reason ? ` — ${d.reason}` : ""}
              {d.superseded ? " (superseded)" : ""}
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Safe actions</h2>
        <p className="muted">
          Automatic merge/delete/cancel are excluded from CC-02. Use manual Event/import workflows.
        </p>
        <div className="button-row">
          {finding.primaryEventId ? (
            <Link className="button" href={`/events/${finding.primaryEventId}`}>
              Open Event
            </Link>
          ) : null}
          <Link className="button secondary" href={`/system/calendar/integrity/scans/${finding.scanId}`}>
            Back to scan
          </Link>
          <Link className="button secondary" href="/import/google-calendar/apply">
            Import apply queue
          </Link>
        </div>
      </section>
    </div>
  );
}
