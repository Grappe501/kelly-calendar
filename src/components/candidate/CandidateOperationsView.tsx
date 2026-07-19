import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { CandidateOperationsHome } from "@/lib/missions/candidate-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  candidate: CandidateOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function CandidateOperationsView({
  candidate,
  advisory,
  viewerDisplayName,
}: Props) {
  const brief = candidate.candidateBrief;

  return (
    <div className="page-stack candidate-operations">
      <header className="page-header">
        <p className="muted">
          Is the candidate prepared for today&apos;s engagements?
        </p>
        <h1>Candidate Operations</h1>
        <p className="muted">
          {candidate.date} · {candidate.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="cand-brief">
        <h2 id="cand-brief">Candidate Brief</h2>
        <p>
          <strong>{brief.greeting}</strong>
        </p>
        <ul className="command-count-grid">
          <li>
            <strong>{brief.preparednessScore}</strong>
            <span className="muted">Preparedness Score</span>
          </li>
          <li>
            <strong>{brief.todaysSchedule.length}</strong>
            <span className="muted">Today&apos;s Schedule</span>
          </li>
          <li>
            <strong>{candidate.executiveFeed.blockedDomains}</strong>
            <span className="muted">Blocked domains</span>
          </li>
          <li>
            <strong>{candidate.executiveFeed.unknownDomains}</strong>
            <span className="muted">Unknown domains</span>
          </li>
        </ul>
        <p>{candidate.executiveFeed.briefingLine}</p>
        <p className="muted">
          Orchestrates Phase 1 — does not replace or duplicate kernel facts.
          Prepared means ready to engage, not merely scheduled.
        </p>
        <div className="button-row">
          <Link className="button secondary" href="/command">
            Executive Command
          </Link>
          <Link className="button secondary" href="#cand-binder">
            Candidate Binder
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="cand-morning">
        <h2 id="cand-morning">Good Morning Kelly</h2>
        <dl className="candidate-morning-list">
          <div>
            <dt>Today&apos;s Schedule</dt>
            <dd>
              {brief.todaysSchedule.length === 0 ? (
                <span className="muted">No permissioned engagements today.</span>
              ) : (
                <ul>
                  {brief.todaysSchedule.map((s) => (
                    <li key={s.missionId}>
                      <Link href={s.href}>
                        {s.whenLabel} — {s.title}
                      </Link>
                      <span className="muted"> · {s.whereLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
          <div>
            <dt>Travel</dt>
            <dd>{brief.travel}</dd>
          </div>
          <div>
            <dt>Speaking Notes</dt>
            <dd>{brief.speakingNotes}</dd>
          </div>
          <div>
            <dt>People You&apos;ll Meet</dt>
            <dd>{brief.peopleYoullMeet}</dd>
          </div>
          <div>
            <dt>Local Issues</dt>
            <dd>
              <strong>Unknown</strong>
              <p className="muted">{brief.localIssues.reason}</p>
            </dd>
          </div>
          <div>
            <dt>Media</dt>
            <dd>{brief.media}</dd>
          </div>
          <div>
            <dt>Potential Risks</dt>
            <dd>
              <ul>
                {brief.potentialRisks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Required Decisions</dt>
            <dd>
              {brief.requiredDecisions.length === 0 ? (
                <span className="muted">None flagged.</span>
              ) : (
                <ul>
                  {brief.requiredDecisions.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="cand-ready">
        <h2 id="cand-ready">Candidate Readiness</h2>
        <p>
          Overall preparedness <strong>{candidate.preparednessScore}</strong> —
          minimum of required domains.
        </p>
        <ul className="logistics-mission-list">
          {candidate.readinessDomains.map((d) => (
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

      <section className="panel" aria-labelledby="cand-engage">
        <h2 id="cand-engage">Engagement Briefs</h2>
        {candidate.engagementBriefs.length === 0 ? (
          <p className="muted">No stops in permissioned view today.</p>
        ) : (
          <ul className="logistics-mission-list">
            {candidate.engagementBriefs.map((e) => (
              <li key={e.missionId} data-readiness={e.preparedness}>
                <div>
                  <strong>{e.missionTitle}</strong>
                  <p className="muted">
                    {e.whenLabel} · Prep {e.preparedness}
                  </p>
                  <p>
                    County: {e.countySnapshot} · Logistics{" "}
                    <strong>{e.logisticsStatus}</strong> · Compliance{" "}
                    <strong>{e.complianceStatus}</strong>
                  </p>
                  <p>{e.talkingPoints}</p>
                  <p className="muted">{e.volunteerLead}</p>
                  <p className="muted">
                    Host / attendance / supporters / concerns: Unknown (not a
                    CRM).
                  </p>
                </div>
                <Link className="button secondary" href={e.href}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="cand-inbox">
        <h2 id="cand-inbox">Candidate Inbox</h2>
        <p className="muted">Separate from Executive Inbox — candidate-facing only.</p>
        <ul className="logistics-mission-list">
          {candidate.candidateInbox.map((item) => (
            <li key={item.id} data-status={item.status}>
              <div>
                <strong>{item.title}</strong>
                <p className="muted">
                  {item.category} · {item.status}
                </p>
                <p>{item.detail}</p>
              </div>
              {item.href ? (
                <Link className="button secondary" href={item.href}>
                  Open
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="cand-binder">
        <h2 id="cand-binder">Candidate Binder</h2>
        <p className="muted">{candidate.binder.note}</p>
        <p className="muted">
          Assembled from: {candidate.binder.assembledFrom.join(" · ")}
        </p>
        {candidate.binder.sections.map((s) => (
          <div key={s.heading} className="candidate-binder-section">
            <h3>{s.heading}</h3>
            <pre className="candidate-binder-body">{s.body}</pre>
          </div>
        ))}
      </section>

      <section className="panel" aria-labelledby="cand-unknown">
        <h2 id="cand-unknown">First-class Unknowns</h2>
        <ul className="logistics-unknown-list">
          {candidate.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="cand-advisory">
        <h2 id="cand-advisory">AI advisory</h2>
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
                "Optional advisory — candidate preparedness stays authoritative."}
            </p>
            <Link className="button secondary" href="/candidate?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
