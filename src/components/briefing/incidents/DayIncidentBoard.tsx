import Link from "next/link";
import type { DayIncidentBoardView } from "@/lib/missions/v21/incident-log";
import { labelFindingSeverity } from "@/lib/missions/v21/incident-log/labels";

type Props = { model: DayIncidentBoardView };

export function DayIncidentBoard({ model }: Props) {
  return (
    <article className="page-stack day-incident-board">
      <header className="briefing-header">
        <h1>Day Incident Board</h1>
        <p className="executive-question">
          Review operational exceptions, severity, and carry-forward items for
          the campaign day.
        </p>
        <p className="briefing-date-line">{model.dateLabel}</p>
        <p className="muted">
          {model.timezone}
          {model.isToday ? " · Today" : model.isPast ? " · Past day" : " · Future day"}
        </p>
        <p role="alert" className="briefing-risks">
          {model.emergencyNotice}
        </p>
        <p role="note">
          Incident logging does not start or complete this Mission.
        </p>
        <nav className="briefing-nav" aria-label="Incident board navigation">
          <Link href={model.navigation.previousHref ?? "#"}>Previous</Link>
          <Link href={model.navigation.todayHref}>Today</Link>
          <Link href={model.navigation.nextHref ?? "#"}>Next</Link>
          <Link href={model.navigation.briefingHref}>Briefing</Link>
          <Link href={`/system/briefing/${model.campaignDate}/movement`}>
            Day Movement
          </Link>
          <Link href={`/system/briefing/${model.campaignDate}/logistics`}>
            Day Logistics
          </Link>
          <Link href={model.navigation.fieldOpsHref}>Day Field Ops</Link>
          <Link href={model.navigation.launchHref}>Launch Review</Link>
          <Link href={model.navigation.closeoutHref}>Closeout</Link>
          <Link href={model.navigation.commandCenterHref}>Command Center</Link>
          <Link href={model.navigation.reportHref}>Report</Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="incidents-sum-h">
        <h2 id="incidents-sum-h">Summary</h2>
        <ul className="briefing-fact-list">
          <li>{model.summary.missionCount} Missions</li>
          <li>{model.summary.incidentCount} incidents</li>
          <li>{model.summary.activeCount} active</li>
          <li>{model.summary.highCriticalCount} high/critical</li>
          <li>{model.summary.blockerCount} blockers</li>
          <li>{model.summary.warningCount} warnings</li>
          <li>
            First Mission: {model.summary.firstMissionTitle ?? "None"}
          </li>
          <li>
            Primary Mission: {model.summary.primaryMissionTitle ?? "None"}
          </li>
        </ul>
      </section>

      {model.incidents.length === 0 ? (
        <section className="panel empty-state">
          <h2>No incidents recorded</h2>
          <p className="muted">
            There are no operational exceptions logged for this campaign day.
          </p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="incidents-list-h">
          <h2 id="incidents-list-h">Chronological incidents</h2>
          <ul className="briefing-list">
            {model.incidents.map((inc) => (
              <li key={inc.incidentId}>
                <h3>
                  {inc.incidentRef}
                  {inc.isArchived ? " · Archived" : ""}
                  {inc.isHighCritical ? " · High/Critical" : ""}
                </h3>
                <p className="muted">
                  {inc.missionTitle} · {inc.whenLabel}
                </p>
                <p>
                  {inc.categoryLabel} · <strong>{inc.severityLabel}</strong> ·{" "}
                  {inc.statusLabel}
                </p>
                {inc.summary ? <p>{inc.summary}</p> : null}
                {inc.findings.length > 0 ? (
                  <ul>
                    {inc.findings.slice(0, 4).map((f) => (
                      <li key={f.issueKey}>
                        {labelFindingSeverity(f.severity)}: {f.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p>
                  <Link href={inc.href}>Open incident</Link>
                  {" · "}
                  <Link href={inc.missionHref}>Open Mission</Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="briefing-footer muted">
        <p>
          Generated {model.generatedAt} · Manual incident data only · Not
          emergency dispatch
        </p>
      </footer>
    </article>
  );
}
