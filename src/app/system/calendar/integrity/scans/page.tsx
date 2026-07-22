import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listIntegrityScans } from "@/server/services/calendar-integrity-service";

export const metadata: Metadata = { title: "Integrity scans" };
export const dynamic = "force-dynamic";

export default async function IntegrityScansPage() {
  const actor = await requireActiveAuthenticatedActor();
  const scans = await listIntegrityScans(actor, 40);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Integrity scans</h1>
        <p>Persisted scan history. Ordinary page loads do not create scans.</p>
      </header>
      <section className="panel">
        <ul className="plain-list">
          {scans.map((s) => (
            <li key={s.id}>
              <Link href={`/system/calendar/integrity/scans/${s.id}`}>
                {s.startedAt.toISOString()} · {s.scope} · examined {s.eventsExamined} ·{" "}
                {s.findingsTotal} findings · {s.status}
                {s.truncated ? " · truncated" : ""}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Link className="button secondary" href="/system/calendar/integrity">
        Back to integrity console
      </Link>
    </div>
  );
}
