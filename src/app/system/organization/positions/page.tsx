import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOrganizationDirectory } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Positions" };
export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dir = await getOrganizationDirectory(actor);
  const vacant = dir.positions.filter((p) => p.status === "VACANT");
  return (
    <div className="page-stack">
      <h1>Positions</h1>
      <p>
        {dir.positions.length} positions · {vacant.length} vacant · no fabricated people
      </p>
      <ul>
        {dir.positions.slice(0, 120).map((p) => (
          <li key={p.id}>
            {p.title} · {p.status}
            {p.county ? ` · ${p.county}` : ""}
            {p.cluster ? ` · ${p.cluster}` : ""}
          </li>
        ))}
      </ul>
      {dir.positions.length > 120 ? (
        <p className="muted">Showing first 120 — open counties view for captains.</p>
      ) : null}
      <Link href="/system/organization">Back</Link>
    </div>
  );
}
