import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { CountyOperationsHome } from "@/lib/missions/county-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  counties: CountyOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function CountyOperationsView({
  counties,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack county-operations">
      <header className="page-header">
        <p className="muted">Where are we weak?</p>
        <h1>County Operations</h1>
        <p className="muted">
          {counties.date} · {counties.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="county-home">
        <h2 id="county-home">Statewide snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{counties.groupCounts.NEEDS_IMMEDIATE_ATTENTION}</strong>
            <span className="muted">Need attention</span>
          </li>
          <li>
            <strong>{counties.groupCounts.READY_FOR_EXPANSION}</strong>
            <span className="muted">Ready to expand</span>
          </li>
          <li>
            <strong>{counties.groupCounts.HEALTHY_OPERATIONS}</strong>
            <span className="muted">Healthy</span>
          </li>
          <li>
            <strong>{counties.groupCounts.INACTIVE_NO_LEADERSHIP}</strong>
            <span className="muted">Inactive / no lead</span>
          </li>
          <li>
            <strong>{counties.totalCounties}</strong>
            <span className="muted">Counties</span>
          </li>
        </ul>
        <p>{counties.executiveFeed.briefingLine}</p>
        <div className="button-row">
          <Link className="button secondary" href="/field">
            Field Ops
          </Link>
          <Link className="button secondary" href="/command">
            Executive Command
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="county-weak">
        <h2 id="county-weak">Weakest counties</h2>
        {counties.weakest.length === 0 ? (
          <p className="muted">No active county weakness signals today.</p>
        ) : (
          <ul className="county-weak-list">
            {counties.weakest.map((c) => (
              <li key={c.slug} data-risk={c.operationalRisk}>
                <div>
                  <strong>
                    {c.countyName}{" "}
                    <span className="muted">· {c.healthScore}/100</span>
                  </strong>
                  <p>{c.healthExplanation}</p>
                </div>
                <Link className="button secondary" href={c.href}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {counties.groups.map((group) => (
        <section
          key={group.group}
          className="panel"
          aria-labelledby={`county-group-${group.group}`}
          data-group={group.group}
        >
          <h2 id={`county-group-${group.group}`}>
            {group.label}{" "}
            <span className="muted">({group.counties.length})</span>
          </h2>
          {group.counties.length === 0 ? (
            <p className="muted">None in this band.</p>
          ) : group.group === "INACTIVE_NO_LEADERSHIP" ? (
            <ul className="county-chip-list" aria-label="Inactive counties">
              {group.counties.map((c) => (
                <li key={c.slug}>
                  <Link href={c.href}>{c.countyName}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="county-node-list">
              {group.counties.map((c) => (
                <li key={c.slug} data-group={c.group}>
                  <div className="county-node-head">
                    <strong>{c.countyName} County</strong>
                    <span className="muted">
                      Health {c.healthScore} · Risk {c.operationalRisk}
                    </span>
                  </div>
                  <dl className="county-node-meta">
                    <div>
                      <dt>Leader</dt>
                      <dd>{c.leaderLabel}</dd>
                    </div>
                    <div>
                      <dt>Readiness</dt>
                      <dd>{c.readinessLabel}</dd>
                    </div>
                    <div>
                      <dt>Upcoming</dt>
                      <dd>{c.upcomingCount}</dd>
                    </div>
                    <div>
                      <dt>Open needs</dt>
                      <dd>
                        {c.openNeeds.length > 0 ? c.openNeeds.join(", ") : "None flagged"}
                      </dd>
                    </div>
                  </dl>
                  <Link className="button secondary" href={c.href}>
                    County command
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="panel" aria-labelledby="county-advisory">
        <h2 id="county-advisory">AI advisory</h2>
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
                "Optional advisory patterns — deterministic health scores stay authoritative."}
            </p>
            <Link className="button secondary" href="/counties?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
