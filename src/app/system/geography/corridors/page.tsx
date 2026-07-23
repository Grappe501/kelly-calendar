import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listCorridors } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "Travel corridors" };
export const dynamic = "force-dynamic";

export default async function GeographyCorridorsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const corridors = await listCorridors(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Travel corridors</h1>
        <p>Campaign travel corridors (empty until operators add them).</p>
      </header>
      <section className="panel">
        {corridors.length === 0 ? (
          <p className="muted">No corridors yet.</p>
        ) : (
          <ul className="plain-list">
            {corridors.map((c) => (
              <li key={c.id}>
                {c.name} · {c._count.nodes} nodes
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
