import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listFindings } from "@/server/services/calendar-health-service";

export const metadata: Metadata = { title: "Calendar health findings" };
export const dynamic = "force-dynamic";

type Search = Promise<{ domain?: string; runId?: string }>;

export default async function CalendarHealthFindingsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const sp = await searchParams;
  const actor = await requireActiveAuthenticatedActor();
  const findings = await listFindings(actor, {
    domain: sp.domain,
    runId: sp.runId,
    limit: 100,
  });

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Health findings</h1>
        <p className="muted">
          {sp.domain ? `Domain filter: ${sp.domain}` : "Recent findings across runs."}
        </p>
        <p>
          <Link className="chip chip-link" href="/system/calendar/health">
            Dashboard
          </Link>
        </p>
      </header>
      <section className="panel">
        {findings.length === 0 ? (
          <p className="muted">No findings.</p>
        ) : (
          <ul className="plain-list">
            {findings.map((f) => (
              <li key={f.id}>
                <Link href={`/system/calendar/health/findings/${f.id}`}>
                  [{f.severity}] {f.domain}/{f.findingType} — {f.summary}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
