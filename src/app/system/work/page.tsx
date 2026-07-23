import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import {
  getAssistantCampaignManagerHome,
  getWorkPortfolio,
} from "@/server/services/campaign-volunteer-service";

export const metadata: Metadata = { title: "Campaign work" };
export const dynamic = "force-dynamic";

export default async function WorkHomePage() {
  const actor = await requireActiveAuthenticatedActor();
  const [acm, portfolio] = await Promise.all([
    getAssistantCampaignManagerHome(actor),
    getWorkPortfolio(actor),
  ]);

  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader
        title="Campaign work"
        principle="One work graph — source links intact · no copied mutable truth"
      />
      <p>
        <Link href="/system/operations/assistant-campaign-manager">
          Assistant Campaign Manager home
        </Link>
      </p>
      <section className="panel">
        <h2>Hierarchy</h2>
        <p className="muted">{portfolio.hierarchy.join(" → ")}</p>
      </section>
      <section className="panel">
        <h2>Priorities</h2>
        <ol>
          {acm.campaignPriorities.map((p) => (
            <li key={p.id}>
              <Link href={p.sourceHref}>{p.title}</Link>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel">
        <h2>Work items (activation tasks)</h2>
        <ul>
          {portfolio.items.slice(0, 25).map((i) => (
            <li key={i.id}>
              <Link href={i.sourceHref}>{i.title}</Link>
              <span className="muted">
                {" "}
                · {i.department} · {i.status}
              </span>
            </li>
          ))}
        </ul>
        <p className="muted">
          Index rows created this read: {portfolio.indexRowsCreated}
        </p>
      </section>
      <nav className="button-row">
        <Link className="chip chip-link" href="/system/work/portfolio">
          Portfolio
        </Link>
        <Link className="chip chip-link" href="/system/work/timeline">
          Timeline
        </Link>
        <Link className="chip chip-link" href="/system/work/workload">
          Workload
        </Link>
      </nav>
    </div>
  );
}
