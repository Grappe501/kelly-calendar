import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOrganizationDirectory } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Counties" };
export const dynamic = "force-dynamic";

export default async function CountiesOrgPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dir = await getOrganizationDirectory(actor);
  const captains = dir.positions.filter((p) => p.key.startsWith("COUNTY_CAPTAIN_"));
  return (
    <div className="page-stack">
      <h1>County Captains (IC-01)</h1>
      <p>
        {captains.length} vacant captain seats · maturity stays UNCONTACTED until
        organizing facts exist (not Event attendance alone).
      </p>
      <ul>
        {captains.map((p) => (
          <li key={p.id}>
            {p.title} · {p.status}
          </li>
        ))}
      </ul>
      <Link href="/system/organization">Back</Link>
    </div>
  );
}
