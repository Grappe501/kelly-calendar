import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getPlace } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "Place detail" };
export const dynamic = "force-dynamic";

export default async function GeographyPlaceDetailPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const actor = await requireActiveAuthenticatedActor();
  const { placeId } = await params;
  const place = await getPlace(actor, placeId);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>{place.name}</h1>
        <p>
          {place.placeType} · GEOID {place.censusPlaceGeoid} · rank{" "}
          {place.populationRank ?? "—"} · pop{" "}
          {place.population?.toLocaleString() ?? "—"}
        </p>
      </header>
      <section className="panel">
        <h2>Counties</h2>
        <ul className="plain-list">
          {place.counties.map((link) => (
            <li key={link.id}>
              <Link href={`/system/geography/counties/${link.county.id}`}>
                {link.county.name} ({link.county.fipsCode})
                {link.isPrimary ? " · primary" : ""}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Link className="button secondary" href="/system/geography/places">
        Back to places
      </Link>
    </div>
  );
}
