import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { FundraisingOperationsHome } from "@/lib/missions/fundraising-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  fundraising: FundraisingOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function FundraisingOperationsView({
  fundraising,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack fundraising-operations">
      <header className="page-header">
        <p className="muted">
          Can the campaign sustainably generate the resources needed to execute
          the mission?
        </p>
        <h1>Fundraising Operations</h1>
        <p className="muted">
          {fundraising.date} · {fundraising.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="fr-snap">
        <h2 id="fr-snap">Fundraising readiness</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{fundraising.fundraisingReadiness}</strong>
            <span className="muted">Fundraising Readiness</span>
          </li>
          <li>
            <strong>{fundraising.upcomingEvents}</strong>
            <span className="muted">Upcoming Events</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Critical Follow-ups</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Pipeline Health</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Near-term Opportunities</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Campaign Funding Outlook</span>
          </li>
        </ul>
        <p>{fundraising.executiveFeed.briefingLine}</p>
        <p className="muted">
          Owns fundraising workflow — Finance owns resource state. Not a donor
          CRM. Cash, budgets, reimbursements, and approvals stay with Finance
          &amp; Resources.
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/finance">
            Finance & Resources
          </Link>
          <Link className="button secondary" href="/candidate">
            Candidate Ops
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="fr-events">
        <h2 id="fr-events">Fundraising events</h2>
        {fundraising.eventRows.filter((e) => e.kind !== "NOT_FUNDRAISING")
          .length === 0 ? (
          <p className="muted">
            No fundraising events classified in today&apos;s permissioned view.
          </p>
        ) : (
          <ul className="logistics-mission-list">
            {fundraising.eventRows
              .filter((e) => e.kind !== "NOT_FUNDRAISING")
              .map((e) => (
                <li key={e.missionId} data-readiness={e.fundraisingReadiness}>
                  <div>
                    <strong>{e.missionTitle}</strong>
                    <p className="muted">
                      {e.kind} · {e.whenLabel} ·{" "}
                      {e.countyName ?? "County Unknown"}
                    </p>
                    <p>
                      Readiness <strong>{e.fundraisingReadiness}</strong> · Event
                      prep <strong>{e.eventReadiness}</strong>
                    </p>
                    <p className="muted">{e.objectives}</p>
                  </div>
                  <Link className="button secondary" href={e.href}>
                    Open
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="fr-domains">
        <h2 id="fr-domains">Readiness domains</h2>
        <p className="muted">
          Preparedness = minimum of required domains (not an average).
        </p>
        <ul className="logistics-mission-list">
          {fundraising.readinessDomains.map((d) => (
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

      <section className="panel" aria-labelledby="fr-unknown">
        <h2 id="fr-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {fundraising.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="fr-advisory">
        <h2 id="fr-advisory">AI advisory</h2>
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
                "Optional advisory — fundraising readiness stays authoritative."}
            </p>
            <Link className="button secondary" href="/fundraising?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
