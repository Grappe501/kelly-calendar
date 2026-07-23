import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listRegions } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "Geography regions" };
export const dynamic = "force-dynamic";

export default async function GeographyRegionsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const regions = await listRegions(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Campaign geography regions</h1>
        <p>Campaign-defined regions (empty until operators add them).</p>
      </header>
      <section className="panel">
        {regions.length === 0 ? (
          <p className="muted">No campaign regions yet.</p>
        ) : (
          <ul className="plain-list">
            {regions.map((r) => (
              <li key={r.id}>
                {r.name} · {r._count.members} members
              </li>
            ))}
          </ul>
        )}
      </section>
      <Link className="button secondary" href="/system/geography">
        Back
      </Link>
    </div>
  );
}
