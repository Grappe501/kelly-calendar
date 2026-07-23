import type { Metadata } from "next";
import Link from "next/link";
import { CampaignOpsSuperHeader } from "@/components/operations/CampaignOpsSuperHeader";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getAssistantCampaignManagerHome } from "@/server/services/campaign-volunteer-service";

export const metadata: Metadata = { title: "Assistant Campaign Manager" };
export const dynamic = "force-dynamic";

export default async function AcmHomePage() {
  const actor = await requireActiveAuthenticatedActor();
  const home = await getAssistantCampaignManagerHome(actor);

  return (
    <div className="page-stack">
      <CampaignOpsSuperHeader
        title="Assistant Campaign Manager"
        principle="Campaign-wide project coordination — calendar stays the center"
      />
      <section className="panel">
        <p>
          Position:{" "}
          <strong>
            {home.position?.title ?? "Not in template yet"} ·{" "}
            {home.assistantVacant ? "VACANT" : home.position?.status}
          </strong>
        </p>
        <p className="muted">
          Reports to Campaign Manager. May coordinate ordinary boards. Cannot
          impersonate department approval or open restricted finance detail (
          {String(home.financeRestrictedDetailVisible)}).
        </p>
      </section>
      <section className="panel" aria-labelledby="acm-pri">
        <h2 id="acm-pri">Five campaign priorities</h2>
        <ol>
          {home.campaignPriorities.map((p) => (
            <li key={p.id}>
              <Link href={p.sourceHref}>{p.title}</Link>
              <span className="muted"> · {p.reasons.join("; ")}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel">
        <ul className="muted">
          <li>Due today: {home.workDueToday}</li>
          <li>Overdue: {home.overdue}</li>
          <li>Unowned: {home.unowned}</li>
        </ul>
        <nav className="button-row">
          {home.views.map((v) => (
            <Link key={v.href} className="chip chip-link" href={v.href}>
              {v.label}
            </Link>
          ))}
          <Link className="chip chip-link" href="/system/logistics">
            Logistics board
          </Link>
          <Link className="chip chip-link" href="/calendar">
            Master calendar
          </Link>
        </nav>
      </section>
    </div>
  );
}
