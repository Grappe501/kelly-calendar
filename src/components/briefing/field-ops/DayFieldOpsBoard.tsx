import Link from "next/link";
import type { DayFieldOpsBoardView } from "@/lib/missions/v21/field-ops";
import { labelFieldOpsSessionStatus } from "@/lib/missions/v21/field-ops";

type Props = { model: DayFieldOpsBoardView };

export function DayFieldOpsBoard({ model }: Props) {
  return (
    <article className="page-stack day-field-ops-board">
      <header className="briefing-header">
        <h1>Day Field Ops Board</h1>
        <p className="executive-question">
          Review field readiness, item confirmations, and wrap status for the
          campaign day.
        </p>
        <p className="briefing-date-line">{model.dateLabel}</p>
        <p className="muted">
          {model.timezone}
          {model.isToday ? " · Today" : model.isPast ? " · Past day" : " · Future day"}
        </p>
        <p role="note">
          Field readiness does not start or complete this Mission.
        </p>
        <nav className="briefing-nav" aria-label="Field Ops navigation">
          <Link href={model.navigation.previousHref ?? "#"}>Previous</Link>
          <Link href={model.navigation.todayHref}>Today</Link>
          <Link href={model.navigation.nextHref ?? "#"}>Next</Link>
          <Link href={model.navigation.briefingHref}>Briefing</Link>
          <Link href={model.navigation.movementHref}>Day Movement</Link>
          <Link href={model.navigation.logisticsHref}>Day Logistics</Link>
          <Link href={`/system/briefing/${model.campaignDate}/staffing`}>
            Day Staffing
          </Link>
          <Link href={`/system/briefing/${model.campaignDate}/incidents`}>
            Day Incidents
          </Link>
          <Link href={model.navigation.launchHref}>Launch Review</Link>
          <Link href={model.navigation.closeoutHref}>Closeout</Link>
          <Link href={model.navigation.commandCenterHref}>Command Center</Link>
          <Link href={model.navigation.reportHref}>Report</Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="field-ops-sum-h">
        <h2 id="field-ops-sum-h">Summary</h2>
        <ul className="briefing-fact-list">
          <li>{model.summary.missionCount} Missions</li>
          <li>{model.summary.withSessionCount} with field sessions</li>
          <li>{model.summary.withoutSessionCount} without sessions</li>
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

      {model.missions.length === 0 ? (
        <section className="panel empty-state">
          <h2>No Missions scheduled</h2>
          <p className="muted">
            There is no Mission field readiness to review for this campaign day.
          </p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="field-ops-list-h">
          <h2 id="field-ops-list-h">Chronological field ops</h2>
          <ul className="briefing-list">
            {model.missions.map((m) => (
              <li key={m.missionId}>
                <h3>
                  {m.title}
                  {m.isFirst ? " · First" : ""}
                  {m.isPrimary ? " · Primary" : ""}
                  {m.isCancelled ? " · Cancelled" : ""}
                </h3>
                <p className="muted">
                  {m.whenLabel}
                  {m.locationLabel ? ` · ${m.locationLabel}` : ""}
                </p>
                <p>
                  Readiness: <strong>{m.readinessLabel}</strong>
                  {m.sessionExists
                    ? m.sessionStatus
                      ? ` · Session: ${labelFieldOpsSessionStatus(m.sessionStatus)}`
                      : ""
                    : " · No session"}
                </p>
                <dl className="briefing-dl">
                  <dt>Critical unconfirmed</dt>
                  <dd>{m.criticalUnconfirmedCount}</dd>
                  <dt>Outstanding returns</dt>
                  <dd>{m.outstandingReturnCount}</dd>
                  <dt>Blockers</dt>
                  <dd>{m.blockerCount}</dd>
                  <dt>Warnings</dt>
                  <dd>{m.warningCount}</dd>
                </dl>
                {m.findings.length > 0 ? (
                  <ul>
                    {m.findings.slice(0, 4).map((f) => (
                      <li key={f.issueKey}>
                        {f.severityLabel}: {f.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p>
                  <Link href={m.href}>Open Mission field ops</Link>
                  {" · "}
                  <Link href={m.logisticsHref}>Open Mission logistics</Link>
                  {" · "}
                  <Link href={m.executeHref}>Open Execute</Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="briefing-footer muted">
        <p>
          Generated {model.generatedAt} · Field confirmations are separate from
          logistics pack status
        </p>
      </footer>
    </article>
  );
}
