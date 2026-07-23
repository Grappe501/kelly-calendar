import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOrganizationDirectory } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Clusters" };
export const dynamic = "force-dynamic";

export default async function ClustersPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dir = await getOrganizationDirectory(actor);
  return (
    <div className="page-stack">
      <h1>County clusters</h1>
      <p className="muted">
        Six draft containers — county membership not invented. Approve membership
        intentionally.
      </p>
      <ul>
        {dir.clusters.map((c) => (
          <li key={c.key}>
            {c.displayName} · {c.membershipStatus} · counties {c.countyMembershipCount} ·
            manager {c.managerVacant ? "VACANT" : "filled"}
          </li>
        ))}
      </ul>
      <Link href="/system/organization">Back</Link>
    </div>
  );
}
