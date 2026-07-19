import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { FinanceOperationsHome } from "@/lib/missions/finance-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  finance: FinanceOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function FinanceOperationsView({
  finance,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack finance-operations">
      <header className="page-header">
        <p className="muted">Do we have the resources to sustain the campaign?</p>
        <h1>Finance & Resources Operations</h1>
        <p className="muted">
          {finance.date} · {finance.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="fin-home">
        <h2 id="fin-home">Resource snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>Unknown</strong>
            <span className="muted">Budget risk</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Pending approvals</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Critical purchases</span>
          </li>
          <li>
            <strong>{finance.resourceShortfalls.value}</strong>
            <span className="muted">Resource shortfalls</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Cash position</span>
          </li>
          <li>
            <strong>{finance.financialBlockers.value}</strong>
            <span className="muted">Financial blockers</span>
          </li>
        </ul>
        <p>{finance.executiveFeed.briefingLine}</p>
        <p className="muted">
          Every commitment has an operational state and a resource state — never
          collapsed into one percentage.
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/command">
            Executive Command
          </Link>
          <Link className="button secondary" href="/logistics">
            Logistics Ops
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="fin-missions">
        <h2 id="fin-missions">Mission resource state</h2>
        {finance.missionRows.length === 0 ? (
          <p className="muted">No missions in permissioned view today.</p>
        ) : (
          <ul className="logistics-mission-list">
            {finance.missionRows.map((m) => (
              <li key={m.missionId} data-readiness={m.dual.resourceState}>
                <div>
                  <strong>{m.missionTitle}</strong>
                  <p className="muted">
                    {m.countyName ?? "County Unknown"} · {m.whenLabel}
                  </p>
                  <p>
                    Ops <strong>{m.dual.operationalState}</strong> · Resource{" "}
                    <strong>{m.dual.resourceState}</strong>
                    {m.isFundraising ? " · Fundraising" : ""}
                    {m.financeLeadAssigned ? " · Finance lead" : ""}
                  </p>
                  {m.resourceBlockers.length > 0 ? (
                    <p>{m.resourceBlockers.join("; ")}</p>
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

      <section className="panel" aria-labelledby="fin-unknown">
        <h2 id="fin-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {finance.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="fin-advisory">
        <h2 id="fin-advisory">AI advisory</h2>
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
                "Optional advisory — dual-state resource readiness stays authoritative."}
            </p>
            <Link className="button secondary" href="/finance?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
