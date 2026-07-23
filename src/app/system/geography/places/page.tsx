import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listPlaces } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "Geography places" };
export const dynamic = "force-dynamic";

export default async function GeographyPlacesPage() {
  const actor = await requireActiveAuthenticatedActor();
  const places = await listPlaces(actor, { top250Only: true });
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Top 250 places</h1>
        <p>{places.length} Census places (planning universe).</p>
      </header>
      <section className="panel">
        <ul className="plain-list">
          {places.map((p) => (
            <li key={p.id}>
              <Link href={`/system/geography/places/${p.id}`}>
                #{p.populationRank} {p.name} · {p.placeType} · pop{" "}
                {p.population?.toLocaleString() ?? "—"}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Link className="button secondary" href="/system/geography">
        Back
      </Link>
    </div>
  );
}
