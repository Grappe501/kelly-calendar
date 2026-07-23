import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getRoleAwareDashboard } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Finance operations" };
export const dynamic = "force-dynamic";

export default async function FinanceOpsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dash = await getRoleAwareDashboard(actor, "finance");
  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader
        title="Finance Manager board"
        principle="Compliance-first — restricted access"
      />
      <p className="muted">
        High-level posture only. No contribution, banking, or private donor data on this
        scaffold board.
      </p>
      <section className="panel">
        <h2>Vacant finance seats</h2>
        <ul>
          {dash.vacantCritical
            .filter((v) => v.key.includes("FINANCE") || v.key.includes("TREASURER") || v.key.includes("BUDGET") || v.key.includes("FUNDRAISING"))
            .map((v) => (
              <li key={v.key}>{v.title}</li>
            ))}
        </ul>
      </section>
      <Link className="button secondary" href="/system/operations">
        Ops hub
      </Link>
    </div>
  );
}
