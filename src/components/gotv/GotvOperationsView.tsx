import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { GotvOperationsHome } from "@/lib/missions/gotv-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  gotv: GotvOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function GotvOperationsView({
  gotv,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack gotv-operations">
      <header className="page-header">
        <p className="muted">Are we converting support into turnout?</p>
        <h1>GOTV Operations</h1>
        <p className="muted">
          {gotv.date} · {gotv.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="gotv-snap">
        <h2 id="gotv-snap">GOTV readiness</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{gotv.gotvReadiness}</strong>
            <span className="muted">GOTV Readiness</span>
          </li>
          <li>
            <strong>{gotv.todaysDeployment}</strong>
            <span className="muted">Today&apos;s Deployment</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Coverage Gaps</span>
          </li>
          <li>
            <strong>{gotv.priorityCounties.length || "—"}</strong>
            <span className="muted">Priority Counties</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Election Timeline</span>
          </li>
          <li>
            <strong>{gotv.turnoutRisk}</strong>
            <span className="muted">Turnout Risk</span>
          </li>
        </ul>
        <p>{gotv.executiveFeed.briefingLine}</p>
        {gotv.priorityCounties.length > 0 ? (
          <p className="muted">
            Priority counties: {gotv.priorityCounties.join(", ")}
          </p>
        ) : null}
        <p className="muted">
          Coordinates execution across County, Volunteer, Communications,
          Logistics, and Field — does not replicate those domains. Not a voter
          database.
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/counties">
            County Ops
          </Link>
          <Link className="button secondary" href="/volunteers">
            Volunteer Ops
          </Link>
          <Link className="button secondary" href="/candidate">
            Candidate Ops
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="gotv-deploy">
        <h2 id="gotv-deploy">Today&apos;s deployment</h2>
        {gotv.activityRows.filter((a) => a.kind !== "NOT_GOTV").length === 0 ? (
          <p className="muted">
            No GOTV activities classified in today&apos;s permissioned view.
          </p>
        ) : (
          <ul className="logistics-mission-list">
            {gotv.activityRows
              .filter((a) => a.kind !== "NOT_GOTV")
              .map((a) => (
                <li key={a.missionId} data-readiness={a.deploymentReadiness}>
                  <div>
                    <strong>{a.missionTitle}</strong>
                    <p className="muted">
                      {a.kind} · {a.whenLabel} ·{" "}
                      {a.countyName ?? "County Unknown"}
                    </p>
                    <p>
                      Deployment <strong>{a.deploymentReadiness}</strong>
                    </p>
                    <p className="muted">{a.objectives}</p>
                  </div>
                  <Link className="button secondary" href={a.href}>
                    Open
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="gotv-domains">
        <h2 id="gotv-domains">Readiness domains</h2>
        <p className="muted">
          Preparedness = minimum of required domains (not an average).
        </p>
        <ul className="logistics-mission-list">
          {gotv.readinessDomains.map((d) => (
            <li key={d.domain} data-readiness={d.state}>
              <div>
                <strong>{d.domain}</strong>
                <p>
                  <strong>{d.state}</strong>
                  <span className="muted"> · {d.source}</span>
                </p>
                <p className="muted">{d.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="gotv-unknown">
        <h2 id="gotv-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {gotv.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="gotv-advisory">
        <h2 id="gotv-advisory">AI advisory</h2>
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
                "Optional advisory — GOTV readiness stays authoritative."}
            </p>
            <Link className="button secondary" href="/gotv?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
