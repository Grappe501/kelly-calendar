import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { LogisticsOperationsHome } from "@/lib/missions/logistics-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  logistics: LogisticsOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function LogisticsOperationsView({
  logistics,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack logistics-operations">
      <header className="page-header">
        <p className="muted">Can we actually execute today’s plan?</p>
        <h1>Logistics Operations</h1>
        <p className="muted">
          {logistics.date} · {logistics.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="log-home">
        <h2 id="log-home">Logistics snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{logistics.travelRisk}</strong>
            <span className="muted">Travel risk</span>
          </li>
          <li>
            <strong>{logistics.venueReadinessSummary.value}</strong>
            <span className="muted">Venue gaps</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Vehicle status</span>
          </li>
          <li>
            <strong>{logistics.materialReadiness.value}</strong>
            <span className="muted">Materials at risk</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Equipment issues</span>
          </li>
          <li>
            <strong>{logistics.logisticsBlockers.value}</strong>
            <span className="muted">Logistics blockers</span>
          </li>
        </ul>
        <p>{logistics.executiveFeed.briefingLine}</p>
        <p className="muted">
          Mission readiness = minimum of required domains (not an average).
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

      <section className="panel" aria-labelledby="log-missions">
        <h2 id="log-missions">Mission logistics</h2>
        {logistics.missionRows.length === 0 ? (
          <p className="muted">No missions in permissioned view today.</p>
        ) : (
          <ul className="logistics-mission-list">
            {logistics.missionRows.map((m) => (
              <li key={m.missionId} data-readiness={m.missionReadiness}>
                <div>
                  <strong>{m.missionTitle}</strong>
                  <p className="muted">
                    {m.countyName ?? "County Unknown"} · {m.whenLabel}
                  </p>
                  <p>
                    Overall <strong>{m.missionReadiness}</strong> · Travel{" "}
                    {m.domains.travel} · Transport {m.domains.transportation} ·
                    Venue {m.domains.venue} · Materials {m.domains.materials} ·
                    Lodging {m.domains.lodging}
                  </p>
                  {m.logisticsBlockers.length > 0 ? (
                    <p>{m.logisticsBlockers.join("; ")}</p>
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

      <section className="panel" aria-labelledby="log-unknown">
        <h2 id="log-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {logistics.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="log-advisory">
        <h2 id="log-advisory">AI advisory</h2>
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
                "Optional advisory — domain minimum readiness stays authoritative."}
            </p>
            <Link className="button secondary" href="/logistics?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
