import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listPriorities } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "County priorities" };
export const dynamic = "force-dynamic";

export default async function GeographyPrioritiesPage() {
  const actor = await requireActiveAuthenticatedActor();
  const priorities = await listPriorities(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>County priorities</h1>
        <p>
          Campaign-entered priorities only — never silent AI policy (ADR-102).
        </p>
      </header>
      <section className="panel">
        {priorities.length === 0 ? (
          <p className="muted">No county priorities recorded yet.</p>
        ) : (
          <ul className="plain-list">
            {priorities.map((p) => (
              <li key={p.id}>
                {p.county.name} · {p.priorityTier} · {p.provenance}
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
