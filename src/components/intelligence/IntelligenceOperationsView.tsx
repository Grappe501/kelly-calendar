import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type {
  IntelligenceInsight,
  OperationalIntelligenceHome,
} from "@/lib/missions/intelligence-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  intelligence: OperationalIntelligenceHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

function InsightList({
  title,
  id,
  items,
}: {
  title: string;
  id: string;
  items: IntelligenceInsight[];
}) {
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {items.length === 0 ? (
        <p className="muted">No signals in this category from today’s feeds.</p>
      ) : (
        <ul className="logistics-mission-list">
          {items.map((item) => (
            <li key={item.id} data-readiness={item.severity}>
              <div>
                <strong>{item.title}</strong>
                <p className="muted">
                  {item.severity} · source: {item.sourceModule}
                </p>
                <p>{item.detail}</p>
                <p className="muted">{item.canonicalFact}</p>
              </div>
              {item.href ? (
                <Link className="button secondary" href={item.href}>
                  Open source
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function IntelligenceOperationsView({
  intelligence,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack intelligence-operations">
      <header className="page-header">
        <p className="muted">
          What patterns, risks, and opportunities are emerging across the
          campaign?
        </p>
        <h1>Operational Intelligence</h1>
        <p className="muted">
          {intelligence.date} · {intelligence.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="oi-home">
        <h2 id="oi-home">Intelligence snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{intelligence.insightCounts.critical.value}</strong>
            <span className="muted">Critical</span>
          </li>
          <li>
            <strong>{intelligence.insightCounts.high.value}</strong>
            <span className="muted">High</span>
          </li>
          <li>
            <strong>{intelligence.executiveFeed.emergingRiskCount}</strong>
            <span className="muted">Emerging risks</span>
          </li>
          <li>
            <strong>
              {intelligence.executiveFeed.missionFailureForecastCount}
            </strong>
            <span className="muted">Failure forecasts</span>
          </li>
          <li>
            <strong>{intelligence.executiveFeed.opportunityCount}</strong>
            <span className="muted">Opportunities</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Multi-day trends</span>
          </li>
        </ul>
        <p>{intelligence.executiveFeed.briefingLine}</p>
        <p className="muted">
          Operational Intelligence may interpret canonical facts, but it never
          replaces or overrides them. Interpretation only — never replaces or
          overrides.
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/command">
            Executive Command
          </Link>
          <Link className="button secondary" href="/compliance">
            Compliance Ops
          </Link>
        </div>
      </section>

      <InsightList
        id="oi-risks"
        title="Emerging risks"
        items={intelligence.emergingRisks}
      />
      <InsightList
        id="oi-county"
        title="County trend signals (today)"
        items={intelligence.countyTrendChanges}
      />
      <InsightList
        id="oi-vol"
        title="Volunteer pressure signals"
        items={intelligence.volunteerBurnoutSignals}
      />
      <InsightList
        id="oi-comms"
        title="Communications drift"
        items={intelligence.communicationsDrift}
      />
      <InsightList
        id="oi-forecast"
        title="Mission failure forecasts"
        items={intelligence.missionFailureForecasts}
      />
      <InsightList
        id="oi-resource"
        title="Resource pressure"
        items={intelligence.resourcePressure}
      />
      <InsightList
        id="oi-compliance"
        title="Compliance hotspots"
        items={intelligence.complianceHotspots}
      />
      <InsightList
        id="oi-relationship"
        title="Relationship pressure"
        items={intelligence.relationshipPressure}
      />
      <InsightList
        id="oi-opportunity"
        title="Opportunities"
        items={intelligence.opportunities}
      />

      <section className="panel" aria-labelledby="oi-unknown">
        <h2 id="oi-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {intelligence.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="oi-advisory">
        <h2 id="oi-advisory">AI advisory</h2>
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
                "Optional analyst advisory — deterministic insights stay authoritative."}
            </p>
            <Link className="button secondary" href="/intelligence?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
