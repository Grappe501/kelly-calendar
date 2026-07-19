import Link from "next/link";
import type { CampaignBriefAdvisory } from "@/lib/missions/campaign-brief";
import type { VolunteerOperationsHome } from "@/lib/missions/volunteer-operations";
import { CampaignBriefRefresh } from "@/components/brief/CampaignBriefRefresh";

type Props = {
  volunteers: VolunteerOperationsHome;
  advisory: CampaignBriefAdvisory;
  viewerDisplayName: string;
};

export function VolunteerOperationsView({
  volunteers,
  advisory,
  viewerDisplayName,
}: Props) {
  return (
    <div className="page-stack volunteer-operations">
      <header className="page-header">
        <p className="muted">Do we have enough people to execute the plan?</p>
        <h1>Volunteer Operations</h1>
        <p className="muted">
          {volunteers.date} · {volunteers.timezone}
          <br />
          Signed in as {viewerDisplayName}
        </p>
        <CampaignBriefRefresh />
      </header>

      <section className="panel" aria-labelledby="vol-home">
        <h2 id="vol-home">Capacity snapshot</h2>
        <ul className="command-count-grid">
          <li>
            <strong>Unknown</strong>
            <span className="muted">Available volunteers</span>
          </li>
          <li>
            <strong>{volunteers.assignedToday.value}</strong>
            <span className="muted">Assigned today</span>
          </li>
          <li>
            <strong>{volunteers.openPositions.value}</strong>
            <span className="muted">Open positions</span>
          </li>
          <li>
            <strong>{volunteers.criticalVacancies.value}</strong>
            <span className="muted">Critical vacancies</span>
          </li>
          <li>
            <strong>Unknown</strong>
            <span className="muted">Leadership bench</span>
          </li>
        </ul>
        <p>{volunteers.executiveFeed.briefingLine}</p>
        <div className="button-row">
          <Link className="button secondary" href="/field">
            Field Ops
          </Link>
          <Link className="button secondary" href="/counties">
            Counties
          </Link>
          <Link className="button secondary" href="/command">
            Executive Command
          </Link>
        </div>
      </section>

      <section className="panel" aria-labelledby="vol-recruit">
        <h2 id="vol-recruit">Recruitment priority</h2>
        {volunteers.recruitmentPriority.length === 0 ? (
          <p className="muted">No county recruitment priorities from today’s open roles.</p>
        ) : (
          <ul className="volunteer-priority-list">
            {volunteers.recruitmentPriority.map((row) => (
              <li key={row.countyName} data-priority={row.priority}>
                <div>
                  <strong>
                    {row.countyName}{" "}
                    <span className="muted">· {row.priority}</span>
                  </strong>
                  <p>{row.openRoles} open role(s)</p>
                </div>
                <Link className="button secondary" href={row.href}>
                  County
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="vol-missions">
        <h2 id="vol-missions">Mission capacity</h2>
        {volunteers.missionCapacity.length === 0 ? (
          <p className="muted">No missions in permissioned view today.</p>
        ) : (
          <ul className="volunteer-mission-list">
            {volunteers.missionCapacity.map((m) => (
              <li key={m.missionId}>
                <div>
                  <strong>{m.missionTitle}</strong>
                  <p className="muted">
                    {m.countyName ?? "County Unknown"} · {m.whenLabel}
                  </p>
                  <p>
                    {m.staffingPlanDefined
                      ? `${m.assignedRoles}/${m.requiredRoles} filled · ${m.openRoles} open`
                      : "Staffing plan Undefined → capacity Unknown (not zero)"}
                  </p>
                  <p className="muted">
                    Staffing {m.staffingConfidence} · Assignment{" "}
                    {m.assignmentConfidence} · Backup Unknown · Replacements Unknown
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

      <section className="panel" aria-labelledby="vol-unknown">
        <h2 id="vol-unknown">First-class Unknowns</h2>
        <p className="muted">
          Unknown means the owning fact is not available yet — not zero, false, or
          empty.
        </p>
        <ul className="volunteer-unknown-list">
          {volunteers.unknowns.map((u) => (
            <li key={u.fact}>
              <strong>{u.fact}</strong>
              <p>{u.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="vol-advisory">
        <h2 id="vol-advisory">AI advisory</h2>
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
                "Optional advisory patterns — deterministic capacity stays authoritative."}
            </p>
            <Link className="button secondary" href="/volunteers?advisory=1">
              Generate advisory
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
