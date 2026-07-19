import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { ComplianceOperationsHome } from "@/lib/missions/compliance-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  compliance: ComplianceOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function ComplianceOperationsView({
  compliance,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack compliance-operations">
      <header className="page-header">
        <p className="muted">
          Can we do this legally, ethically, and according to campaign policy?
        </p>
        <h1>Compliance Operations</h1>
        <p className="muted">
          {compliance.date} · {compliance.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="cmp-home">
        <h2 id="cmp-home">Compliance snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{compliance.complianceRisk}</strong>
            <span className="muted">Compliance risk</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Upcoming filings</span>
          </li>
          <li>
            <strong>{compliance.requiredActions.value}</strong>
            <span className="muted">Required actions</span>
          </li>
          <li>
            <strong>{compliance.overdueItems.value}</strong>
            <span className="muted">Overdue items</span>
          </li>
          <li>
            <strong>{compliance.highRiskCommitments.value}</strong>
            <span className="muted">High-risk commitments</span>
          </li>
          <li>
            <strong>{compliance.campaignComplianceStatus}</strong>
            <span className="muted">Campaign compliance</span>
          </li>
        </ul>
        <p>{compliance.executiveFeed.briefingLine}</p>
        <p className="muted">
          Compliance is a readiness domain, not an after-the-fact audit. Mission
          status = minimum of operational, resource, and compliance domains.
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/command">
            Executive Command
          </Link>
          <Link className="button secondary" href="/finance">
            Finance Ops
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="cmp-missions">
        <h2 id="cmp-missions">Mission compliance state</h2>
        {compliance.missionRows.length === 0 ? (
          <p className="muted">No missions in permissioned view today.</p>
        ) : (
          <ul className="logistics-mission-list">
            {compliance.missionRows.map((m) => (
              <li key={m.missionId} data-readiness={m.triple.complianceState}>
                <div>
                  <strong>{m.missionTitle}</strong>
                  <p className="muted">
                    {m.countyName ?? "County Unknown"} · {m.whenLabel}
                  </p>
                  <p>
                    Ops <strong>{m.triple.operationalState}</strong> · Resource{" "}
                    <strong>{m.triple.resourceState}</strong> · Compliance{" "}
                    <strong>{m.triple.complianceState}</strong> · Mission{" "}
                    <strong>{m.triple.missionStatus}</strong>
                  </p>
                  {m.complianceBlockers.length > 0 ? (
                    <p>{m.complianceBlockers.join("; ")}</p>
                  ) : null}
                </div>
                <Link className="button secondary" href={m.href}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="cmp-unknown">
        <h2 id="cmp-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {compliance.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="cmp-advisory">
        <h2 id="cmp-advisory">AI advisory</h2>
        {advisory.status === "advisory" && advisory.text ? (
          <>
            <p>{advisory.text}</p>
            {advisory.uncertaintyNote ? (
              <p className="muted">{advisory.uncertaintyNote}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="muted">
              {advisory.uncertaintyNote ||
                "Optional advisory — compliance readiness stays authoritative."}
            </p>
            <Link className="button secondary" href="/compliance?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
