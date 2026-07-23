import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listFocusAreas } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "Focus areas" };
export const dynamic = "force-dynamic";

export default async function GeographyFocusAreasPage() {
  const actor = await requireActiveAuthenticatedActor();
  const areas = await listFocusAreas(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Focus areas</h1>
        <p>Campaign focus areas (empty until operators add them).</p>
      </header>
      <section className="panel">
        {areas.length === 0 ? (
          <p className="muted">No focus areas yet.</p>
        ) : (
          <ul className="plain-list">
            {areas.map((a) => (
              <li key={a.id}>
                {a.name} · {a._count.geographies} geographies · {a.provenance}
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
