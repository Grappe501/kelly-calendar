import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getGeographyDashboard } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "Geography foundation" };
export const dynamic = "force-dynamic";

export default async function GeographyDashboardPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dash = await getGeographyDashboard(actor);
  const c = dash.counts;
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Arkansas Campaign Geography</h1>
        <p>
          IC-01 foundation ({dash.ic01}) · {dash.authorizationAdr}. Deterministic
          statewide geography — no Event/Mission schedule mutation.
        </p>
      </header>
      <section className="panel">
        <ul className="plain-list">
          <li>Counties: {c.counties}</li>
          <li>Places (all): {c.places}</li>
          <li>Top-250 places: {c.top250Places}</li>
          <li>Regions: {c.regions}</li>
          <li>Corridors: {c.corridors}</li>
          <li>Priorities: {c.priorities}</li>
          <li>Focus areas: {c.focusAreas}</li>
          <li>Sources: {c.sources}</li>
          <li>Active event geographies: {c.activeEventGeographies}</li>
          <li>Active mission geographies: {c.activeMissionGeographies}</li>
        </ul>
      </section>
      <nav className="panel">
        <ul className="plain-list">
          <li>
            <Link href="/system/geography/counties">Counties</Link>
          </li>
          <li>
            <Link href="/system/geography/places">Places (top 250)</Link>
          </li>
          <li>
            <Link href="/system/geography/regions">Regions</Link>
          </li>
          <li>
            <Link href="/system/geography/corridors">Travel corridors</Link>
          </li>
          <li>
            <Link href="/system/geography/priorities">County priorities</Link>
          </li>
          <li>
            <Link href="/system/geography/focus-areas">Focus areas</Link>
          </li>
          <li>
            <Link href="/system/geography/reconciliation">Reconciliation</Link>
          </li>
          <li>
            <Link href="/system/geography/sources">Sources</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
