import type { Metadata } from "next";
import Link from "next/link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getOrganizationAudit } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Organization audit" };
export const dynamic = "force-dynamic";

export default async function OrgAuditPage() {
  const actor = await requireActiveAuthenticatedActor();
  const { items } = await getOrganizationAudit(actor);
  return (
    <div className="page-stack">
      <h1>Organization audit</h1>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            {i.createdAt.toISOString()} · {i.action}
          </li>
        ))}
      </ul>
      <Link href="/system/organization">Back</Link>
    </div>
  );
}
