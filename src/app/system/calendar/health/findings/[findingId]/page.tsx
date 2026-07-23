import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getFinding } from "@/server/services/calendar-health-service";

export const metadata: Metadata = { title: "Calendar health finding" };
export const dynamic = "force-dynamic";

type Params = Promise<{ findingId: string }>;

export default async function CalendarHealthFindingPage({
  params,
}: {
  params: Params;
}) {
  const { findingId } = await params;
  const actor = await requireActiveAuthenticatedActor();
  const finding = await getFinding(actor, findingId);

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
            <span>Domain</span>
            <strong>{finding.domain}</strong>
          </li>
          <li>
            <span>Status</span>
            <strong>{finding.status}</strong>
          </li>
          <li>
            <span>Trend</span>
            <strong>{finding.trend ?? "—"}</strong>
          </li>
          <li>
            <span>Finding key</span>
            <strong>{finding.findingKey}</strong>
          </li>
          <li>
            <span>Evidence fingerprint</span>
            <strong>{finding.evidenceFingerprint}</strong>
          </li>
          <li>
            <span>Related</span>
            <strong>
              {finding.relatedRefType ?? "—"} {finding.relatedRefId ?? ""}
            </strong>
          </li>
        </ul>
      </section>
      <section className="panel">
        <div className="button-row">
          <Link
            className="button secondary"
            href={`/system/calendar/health/runs/${finding.runId}`}
          >
            Back to run
          </Link>
          {finding.integrityFindingId ? (
            <Link
              className="button secondary"
              href={`/system/calendar/integrity/findings/${finding.integrityFindingId}`}
            >
              Integrity finding
            </Link>
          ) : null}
          <Link className="button secondary" href="/system/calendar/health">
            Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
