import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCounty } from "@/server/services/geography-foundation-service";
import { listStrategicFactsForCounty } from "@/server/repositories/reddirt-integration-repository";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";

export const metadata: Metadata = { title: "County detail" };
export const dynamic = "force-dynamic";

export default async function GeographyCountyDetailPage({
  params,
}: {
  params: Promise<{ countyId: string }>;
}) {
  const actor = await requireActiveAuthenticatedActor();
  const { countyId } = await params;
  const county = await getCounty(actor, countyId);
  const strategicFacts = roleHasFullCalendarAccess(actor.primarySystemRole)
    ? await listStrategicFactsForCounty(county.id)
    : [];
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>{county.name} County</h1>
        <p>
          FIPS {county.fipsCode} · seat {county.countySeat ?? "—"} ·{" "}
          {county.seatReviewState ?? "—"}
        </p>
        {strategicFacts[0] ? (
          <p>
            <span className="badge">
              RedDirt-sourced {strategicFacts[0].factKind}:{" "}
              {strategicFacts[0].factValue}
            </span>{" "}
            <Link href="/system/integrations/reddirt/geography">
              Inspect strategic facts
            </Link>
          </p>
        ) : null}
      </header>
      <section className="panel">
        <h2>Linked places</h2>
        <ul className="plain-list">
          {county.placeAuthorities.map((link) => (
            <li key={link.id}>
              <Link href={`/system/geography/places/${link.placeAuthority.id}`}>
                {link.placeAuthority.name}
                {link.isPrimary ? " (primary)" : ""}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Link className="button secondary" href="/system/geography/counties">
        Back to counties
      </Link>
    </div>
  );
}
