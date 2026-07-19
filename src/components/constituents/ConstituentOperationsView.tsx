import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { ConstituentOperationsHome } from "@/lib/missions/constituent-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  constituents: ConstituentOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function ConstituentOperationsView({
  constituents,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack constituent-operations">
      <header className="page-header">
        <p className="muted">
          Who are we serving, where are we building support, and what
          relationships require attention?
        </p>
        <h1>Voter & Constituent Operations</h1>
        <p className="muted">
          {constituents.date} · {constituents.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="cst-home">
        <h2 id="cst-home">Relationship snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{constituents.communityEngagement.value}</strong>
            <span className="muted">Community engagement</span>
          </li>
          <li>
            <strong>{constituents.highPriorityFollowups.value}</strong>
            <span className="muted">High-priority follow-ups</span>
          </li>
          <li>
            <strong>{constituents.relationshipRisk}</strong>
            <span className="muted">Relationship risk</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Target constituencies</span>
          </li>
          <li>
            <strong>
              {constituents.outreachCoverage.status === "known"
                ? constituents.outreachCoverage.value
                : "Unknown"}
            </strong>
            <span className="muted">Outreach coverage</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Engagement momentum</span>
          </li>
        </ul>
        <p>{constituents.executiveFeed.briefingLine}</p>
        <p className="muted">
          Not a CRM. Relationship facts only — no voter-file warehouse, no PII
          projections. Data is collected only when it improves campaign
          execution.
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/command">
            Executive Command
          </Link>
          <Link className="button secondary" href="/field">
            Field Ops
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="cst-missions">
        <h2 id="cst-missions">Mission relationships</h2>
        {constituents.missionRows.length === 0 ? (
          <p className="muted">No missions in permissioned view today.</p>
        ) : (
          <ul className="logistics-mission-list">
            {constituents.missionRows.map((m) => (
              <li key={m.missionId} data-readiness={m.engagement}>
                <div>
                  <strong>{m.missionTitle}</strong>
                  <p className="muted">
                    {m.countyName ?? "County Unknown"} · {m.whenLabel}
                  </p>
                  <p>
                    Engagement <strong>{m.engagement}</strong> · Follow-ups{" "}
                    {m.openFollowups} open / {m.overdueFollowups} overdue ·
                    People {m.peopleLinked} · Orgs {m.organizationsLinked}
                  </p>
                  {m.relationshipBlockers.length > 0 ? (
                    <p>{m.relationshipBlockers.join("; ")}</p>
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

      <section className="panel" aria-labelledby="cst-unknown">
        <h2 id="cst-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {constituents.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="cst-advisory">
        <h2 id="cst-advisory">AI advisory</h2>
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
                "Optional advisory — relationship readiness stays authoritative."}
            </p>
            <Link className="button secondary" href="/constituents?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
