import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { listCounties } from "@/server/services/geography-foundation-service";

export const metadata: Metadata = { title: "Geography counties" };
export const dynamic = "force-dynamic";

export default async function GeographyCountiesPage() {
  const actor = await requireActiveAuthenticatedActor();
  const counties = await listCounties(actor);
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Arkansas counties</h1>
        <p>{counties.length} counties (authority).</p>
      </header>
      <section className="panel">
        <ul className="plain-list">
          {counties.map((c) => (
            <li key={c.id}>
              <Link href={`/system/geography/counties/${c.id}`}>
                {c.name} · {c.fipsCode} · seat {c.countySeat ?? "—"}
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
