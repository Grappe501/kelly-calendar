import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCampaignLogisticsBoard } from "@/server/services/campaign-volunteer-service";

export const metadata: Metadata = { title: "Campaign Logistics" };
export const dynamic = "force-dynamic";

export default async function LogisticsBoardPage() {
  const actor = await requireActiveAuthenticatedActor();
  const board = await getCampaignLogisticsBoard(actor);

  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader
        title="Campaign Logistics"
        principle="Reports directly to the Campaign Manager — serves the whole campaign"
      />
      <section className="panel">
        <p>
          Reporting: <strong>{board.reportsTo}</strong>
        </p>
        <p className="muted">
          Lead: {board.leadPosition?.title ?? "—"} ·{" "}
          {board.leadPosition?.status ?? "not installed"} · reports to{" "}
          {board.leadPosition?.reportsTo ?? "—"}
        </p>
        <p className="muted">{board.reuse.doctrine}</p>
        <ul className="muted">
          <li>Travel plans (D11): {board.counts.travelPlans}</li>
          <li>Logistics packs (D12): {board.counts.logisticsPacks}</li>
          <li>Field ops sessions (D13): {board.counts.fieldOpsSessions}</li>
        </ul>
        <nav className="button-row">
          <Link className="button secondary" href={board.reuse.travelHref}>
            Movement briefing
          </Link>
          <Link className="button secondary" href={board.reuse.logisticsHref}>
            Logistics briefing
          </Link>
          <Link className="button secondary" href={board.reuse.fieldOpsHref}>
            Field ops briefing
          </Link>
        </nav>
      </section>
      <nav className="button-row" aria-label="Logistics sections">
        {board.sections.map((s) => (
          <Link key={s.href} className="chip chip-link" href={s.href}>
            {s.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
