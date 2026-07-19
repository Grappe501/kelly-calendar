import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { CommunicationsOperationsHome } from "@/lib/missions/communications-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  communications: CommunicationsOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function CommunicationsOperationsView({
  communications,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack communications-operations">
      <header className="page-header">
        <p className="muted">Is everyone communicating the same campaign?</p>
        <h1>Communications Operations</h1>
        <p className="muted">
          {communications.date} · {communications.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="comms-home">
        <h2 id="comms-home">Communications snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>Unknown</strong>
            <span className="muted">Today’s message</span>
          </li>
          <li>
            <strong>{communications.mediaCommitments.value}</strong>
            <span className="muted">Media commitments</span>
          </li>
          <li>
            <strong>{communications.pressDeadlines.value}</strong>
            <span className="muted">Press deadlines at risk</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Interviews</span>
          </li>
          <li>
            <strong>{communications.speakingEvents.value}</strong>
            <span className="muted">Speaking events</span>
          </li>
          <li>
            <strong>{communications.rapidResponseNeeded.value}</strong>
            <span className="muted">Rapid response needed</span>
          </li>
          <li>
            <strong>{communications.messagingRisk}</strong>
            <span className="muted">Messaging risk</span>
          </li>
        </ul>
        <p>{communications.executiveFeed.briefingLine}</p>
        <div className="button-row">
          <Link className="button secondary" href="/command">
            Executive Command
          </Link>
          <Link className="button secondary" href="/field">
            Field Ops
          </Link>
          <Link className="button secondary" href="/volunteers">
            Volunteers
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="comms-missions">
        <h2 id="comms-missions">Mission communications</h2>
        {communications.missionRows.length === 0 ? (
          <p className="muted">No missions in permissioned view today.</p>
        ) : (
          <ul className="comms-mission-list">
            {communications.missionRows.map((m) => (
              <li key={m.missionId} data-risk={m.messagingRisk}>
                <div>
                  <strong>{m.missionTitle}</strong>
                  <p className="muted">
                    {m.countyName ?? "County Unknown"} · {m.whenLabel}
                  </p>
                  <p>
                    {m.planDefined
                      ? `${m.readyCount}/${m.itemCount} ready · ${m.openCount} open · ${m.overdueCount} overdue`
                      : "No communications plan → readiness Unknown (not ready)"}
                  </p>
                  <p className="muted">
                    Risk {m.messagingRisk}
                    {m.hasTalkingPoints
                      ? m.talkingPointsReady
                        ? " · Talking points ready"
                        : " · Talking points open"
                      : " · Talking points Unknown"}
                    {m.hasPressItem ? " · Press item" : ""}
                    {m.rapidResponseOpen ? " · Rapid response open" : ""}
                    {m.nextDeadlineLabel ? ` · Next ${m.nextDeadlineLabel}` : ""}
                  </p>
                </div>
                <Link className="button secondary" href={m.href}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="comms-unknown">
        <h2 id="comms-unknown">First-class Unknowns</h2>
        <p className="muted">
          Unknown means the owning fact is not available yet — not zero and not
          “ready.”
        </p>
        <ul className="comms-unknown-list">
          {communications.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="comms-advisory">
        <h2 id="comms-advisory">AI advisory</h2>
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
                "Optional advisory — deterministic plan readiness stays authoritative."}
            </p>
            <Link className="button secondary" href="/communications?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
