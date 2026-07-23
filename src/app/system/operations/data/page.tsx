import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getRoleAwareDashboard } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "Data operations" };
export const dynamic = "force-dynamic";

export default async function DataOpsPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dash = await getRoleAwareDashboard(actor, "operations_data");
  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader title="Operations & Data" />
      <p>
        Connective tissue: calendar, activation routing (IC-02B), logistics, systems,
        reporting.
      </p>
      <ul>
        {dash.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <div className="button-row">
        <Link className="button" href="/system/operations">
          Ops hub
        </Link>
        <Link className="button secondary" href="/calendar">
          Master calendar
        </Link>
      </div>
    </div>
  );
}
