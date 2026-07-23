import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOrganizationDirectory } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Organization chart" };
export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dir = await getOrganizationDirectory(actor);
  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader title="Organization chart" />
      {dir.departments.map((d) => (
        <section key={d.key} className="panel">
          <h2>{d.displayName}</h2>
          <p className="muted">{d.purpose}</p>
          <ul>
            {d.functions.map((f) => (
              <li key={f.key}>{f.displayName}</li>
            ))}
          </ul>
        </section>
      ))}
      <Link className="button secondary" href="/system/organization">
        Organization home
      </Link>
    </div>
  );
}
