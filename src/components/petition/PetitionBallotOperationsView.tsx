import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { PetitionBallotOperationsHome } from "@/lib/missions/petition-ballot-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  petition: PetitionBallotOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function PetitionBallotOperationsView({
  petition,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack petition-ballot-operations">
      <header className="page-header">
        <p className="muted">
          Can we successfully qualify, defend, and execute a petition or ballot
          initiative campaign?
        </p>
        <h1>Petition & Ballot Operations</h1>
        <p className="muted">
          {petition.date} · {petition.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="petition-snap">
        <h2 id="petition-snap">Petition readiness</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{petition.petitionReadiness}</strong>
            <span className="muted">Petition Readiness</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Collection Progress</span>
          </li>
          <li>
            <strong>{petition.countyCoverage}</strong>
            <span className="muted">County Coverage</span>
          </li>
          <li>
            <strong>{petition.validationRisk}</strong>
            <span className="muted">Validation Risk</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Legal Milestones</span>
          </li>
          <li>
            <strong>{petition.educationReadiness}</strong>
            <span className="muted">Education Readiness</span>
          </li>
        </ul>
        <p>{petition.executiveFeed.briefingLine}</p>
        <p className="muted">
          Coordinates campaign strategy across County, Volunteer, Communications,
          Compliance, Logistics, and Field — operational systems provide
          execution truth. Not election administration.
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

      <section className="panel" aria-labelledby="petition-deploy">
        <h2 id="petition-deploy">Today&apos;s petition & ballot activities</h2>
        {petition.activityRows.filter((a) => a.kind !== "NOT_PETITION").length ===
        0 ? (
          <p className="muted">
            No petition/ballot activities classified in today&apos;s permissioned
            view.
          </p>
        ) : (
          <ul className="logistics-mission-list">
            {petition.activityRows
              .filter((a) => a.kind !== "NOT_PETITION")
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

      <section className="panel" aria-labelledby="petition-domains">
        <h2 id="petition-domains">Readiness domains</h2>
        <p className="muted">
          Preparedness = minimum of required domains (not an average).
        </p>
        <ul className="logistics-mission-list">
          {petition.readinessDomains.map((d) => (
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

      <section className="panel" aria-labelledby="petition-unknown">
        <h2 id="petition-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {petition.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="petition-advisory">
        <h2 id="petition-advisory">AI advisory</h2>
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
                "Optional advisory — petition readiness stays authoritative."}
            </p>
            <Link className="button secondary" href="/petition?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
