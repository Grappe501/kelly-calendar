import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { DebateMediaOperationsHome } from "@/lib/missions/debate-media-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  debateMedia: DebateMediaOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function DebateMediaOperationsView({
  debateMedia,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack debate-media-operations">
      <header className="page-header">
        <p className="muted">
          Are we prepared for every public communication?
        </p>
        <h1>Debate & Media Operations</h1>
        <p className="muted">
          {debateMedia.date} · {debateMedia.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="dm-snap">
        <h2 id="dm-snap">Media preparedness</h2>
        <ul className="command-count-grid">
          <li>
            <strong>{debateMedia.mediaConfidence}</strong>
            <span className="muted">Media confidence</span>
          </li>
          <li>
            <strong>{debateMedia.publicAppearancesToday}</strong>
            <span className="muted">Public appearances</span>
          </li>
          <li>
            <strong>{debateMedia.briefingCompleteness}</strong>
            <span className="muted">Briefing completeness</span>
          </li>
          <li>
            <strong>
              {debateMedia.debateReady.status === "known"
                ? debateMedia.debateReady.value
                : "Unknown"}
            </strong>
            <span className="muted">Debates ready</span>
          </li>
          <li>
            <strong>
              {debateMedia.interviewReady.status === "known"
                ? debateMedia.interviewReady.value
                : "Unknown"}
            </strong>
            <span className="muted">Interviews ready</span>
          </li>
          <li>
            <strong>{debateMedia.executiveFeed.appearancesAtRisk}</strong>
            <span className="muted">Appearances at risk</span>
          </li>
        </ul>
        <p>{debateMedia.executiveFeed.briefingLine}</p>
        <p className="muted">
          Assembles operational context — not a parallel communications system.
          Schedule, logistics, and communications artifacts stay with Phase 1.
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/candidate">
            Candidate Ops
          </Link>
          <Link className="button secondary" href="/communications">
            Communications
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="dm-cal">
        <h2 id="dm-cal">Media calendar</h2>
        {debateMedia.mediaCalendar.filter((a) => a.kind !== "NOT_PUBLIC")
          .length === 0 ? (
          <p className="muted">
            No public appearances classified in today&apos;s permissioned view.
          </p>
        ) : (
          <ul className="logistics-mission-list">
            {debateMedia.mediaCalendar
              .filter((a) => a.kind !== "NOT_PUBLIC")
              .map((a) => (
                <li key={a.missionId} data-readiness={a.mediaConfidence}>
                  <div>
                    <strong>{a.missionTitle}</strong>
                    <p className="muted">
                      {a.kind} · {a.whenLabel} ·{" "}
                      {a.countyName ?? "County Unknown"}
                    </p>
                    <p>
                      Confidence <strong>{a.mediaConfidence}</strong> · Briefing{" "}
                      <strong>{a.briefingCompleteness}</strong> · Appearance{" "}
                      <strong>{a.appearanceReadiness}</strong>
                    </p>
                  </div>
                  <Link className="button secondary" href={a.href}>
                    Open
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="dm-ready">
        <h2 id="dm-ready">Readiness domains</h2>
        <p className="muted">
          Preparedness = minimum of required domains (not an average).
        </p>
        <ul className="logistics-mission-list">
          {debateMedia.readinessDomains.map((d) => (
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

      <section className="panel" aria-labelledby="dm-unknown">
        <h2 id="dm-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {debateMedia.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="dm-advisory">
        <h2 id="dm-advisory">AI advisory</h2>
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
                "Optional advisory — media preparedness stays authoritative."}
            </p>
            <Link className="button secondary" href="/debate-media?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
