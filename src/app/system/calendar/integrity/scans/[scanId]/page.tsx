import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getIntegrityScan } from "@/server/services/calendar-integrity-service";

export const metadata: Metadata = { title: "Integrity scan" };
export const dynamic = "force-dynamic";

type Params = Promise<{ scanId: string }>;

export default async function IntegrityScanDetailPage({ params }: { params: Params }) {
  const { scanId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  const scan = await getIntegrityScan(actor, scanId);

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Scan {scan.id.slice(0, 8)}…</h1>
        <p>
          {scan.scope} · {scan.status} · detector {scan.detectorVersion}
        </p>
      </header>
      {scan.truncated ? (
        <section className="dev-banner" role="status">
          {scan.truncationNote ?? "Scan truncated at soft limit."}
        </section>
      ) : null}
      <section className="panel">
        <ul className="status-list">
          <li>
            <span>Events examined</span>
            <strong>{scan.eventsExamined}</strong>
          </li>
          <li>
            <span>Findings</span>
            <strong>{scan.findingsTotal}</strong>
          </li>
        </ul>
      </section>
      <section className="panel">
        <h2>Findings</h2>
        <ul className="plain-list">
          {scan.findings.map((f) => (
            <li key={f.id}>
              <Link href={`/system/calendar/integrity/findings/${f.id}`}>
                [{f.severity}] {f.findingType} — {f.summary}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Link className="button secondary" href="/system/calendar/integrity">
        Integrity console
      </Link>
    </div>
  );
}
