import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getWorkPortfolio } from "@/server/services/campaign-volunteer-service";

export const metadata: Metadata = { title: "Work view" };
export const dynamic = "force-dynamic";

export default async function WorkViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const actor = await requireActiveAuthenticatedActor();
  const { view } = await params;
  const portfolio = await getWorkPortfolio(actor);

  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader
        title={`Work · ${view}`}
        principle="List / board / timeline / calendar — source-linked"
      />
      <p>
        <Link href="/system/work">← Work</Link>
      </p>
      <section className="panel">
        <p className="muted">
          View mode: {view}. Showing source-linked activation tasks (
          {portfolio.items.length}).
        </p>
        <ul>
          {portfolio.items.slice(0, 40).map((i) => (
            <li key={i.id}>
              <Link href={i.sourceHref}>{i.title}</Link>
              <span className="muted">
                {" "}
                · due {i.dueAt ?? "—"} · {i.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
