import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getRoleAwareDashboard } from "@/server/services/campaign-organization-service";

export const metadata: Metadata = { title: "My Work" };
export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const actor = await requireActiveAuthenticatedActor();
  const dash = await getRoleAwareDashboard(actor, "campaign_manager");
  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader title="My Work" />
      <p>Authorized boards: {dash.authorizedBoards.join(", ") || "none yet"}</p>
      <section className="panel">
        <h2>Vacant critical positions</h2>
        <ul>
          {dash.vacantCritical.map((v) => (
            <li key={v.key}>{v.title}</li>
          ))}
        </ul>
      </section>
      <div className="button-row">
        <Link className="button secondary" href="/system/my-calendar">
          My Calendar
        </Link>
        <Link className="button secondary" href="/system/organization">
          Organization
        </Link>
        <Link className="button secondary" href="/system/operations">
          Operations
        </Link>
      </div>
    </div>
  );
}
