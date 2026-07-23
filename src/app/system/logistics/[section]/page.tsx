import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCampaignLogisticsBoard } from "@/server/services/campaign-volunteer-service";

export const metadata: Metadata = { title: "Logistics section" };
export const dynamic = "force-dynamic";

export default async function LogisticsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const actor = await requireActiveAuthenticatedActor();
  const { section } = await params;
  const board = await getCampaignLogisticsBoard(actor);

  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader
        title={`Logistics · ${section}`}
        principle="Reuses D11–D13 — no duplicate state machines"
      />
      <p>
        <Link href="/system/logistics">← Campaign Logistics</Link>
      </p>
      <section className="panel">
        <p>
          Drill-down for <strong>{section}</strong>. Canonical facts live on Mission
          travel / logistics / field-ops records.
        </p>
        <nav className="button-row">
          <Link className="button secondary" href={board.reuse.travelHref}>
            Travel / movement
          </Link>
          <Link className="button secondary" href={board.reuse.logisticsHref}>
            Logistics pack
          </Link>
          <Link className="button secondary" href={board.reuse.fieldOpsHref}>
            Field ops
          </Link>
        </nav>
      </section>
    </div>
  );
}
