import Link from "next/link";
import type { DayMovementBoardView } from "@/lib/missions/v21/travel-movement";

type Props = { model: DayMovementBoardView };

export function DayMovementBoard({ model }: Props) {
  return (
    <article className="page-stack day-movement-board">
      <header className="briefing-header">
        <h1>Day Movement Board</h1>
        <p className="executive-question">
          Review departures, legs, and movement readiness for the campaign day.
        </p>
        <p className="briefing-date-line">{model.dateLabel}</p>
        <p className="muted">
          {model.timezone}
          {model.isToday ? " · Today" : model.isPast ? " · Past day" : " · Future day"}
        </p>
        <p role="note">
          Movement planning does not start Mission execution or launch the campaign
          day.
        </p>
        <nav className="briefing-nav" aria-label="Movement navigation">
          <Link href={model.navigation.previousHref ?? "#"}>Previous</Link>
          <Link href={model.navigation.todayHref}>Today</Link>
          <Link href={model.navigation.nextHref ?? "#"}>Next</Link>
          <Link href={model.navigation.briefingHref}>Briefing</Link>
          <Link href={model.navigation.launchHref}>Launch Review</Link>
          <Link href={model.navigation.closeoutHref}>Closeout</Link>
          <Link href={model.navigation.commandCenterHref}>Command Center</Link>
          <Link href={model.navigation.reportHref}>Report</Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="movement-sum-h">
        <h2 id="movement-sum-h">Summary</h2>
        <ul className="briefing-fact-list">
          <li>{model.summary.missionCount} Missions</li>
          <li>{model.summary.withPlanCount} with travel plans</li>
          <li>{model.summary.withoutPlanCount} without plans</li>
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
            There is no Mission movement to review for this campaign day.
          </p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="movement-list-h">
          <h2 id="movement-list-h">Chronological movement</h2>
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
                  {m.planExists ? "" : " · No plan"}
                </p>
                <dl className="briefing-dl">
                  <dt>Departure</dt>
                  <dd>{m.departureLabel ?? "Not set"}</dd>
                  <dt>Arrival</dt>
                  <dd>{m.arrivalLabel ?? "Not set"}</dd>
                  <dt>Buffer</dt>
                  <dd>
                    {m.bufferMinutes != null
                      ? `${m.bufferMinutes} minutes`
                      : "Not set"}
                  </dd>
                  <dt>Driver</dt>
                  <dd>{m.driverLabel ?? "Not set"}</dd>
                  <dt>Vehicle</dt>
                  <dd>{m.vehicleLabel ?? "Not set"}</dd>
                </dl>
                {m.legs.length > 0 ? (
                  <ol>
                    {m.legs.map((l) => (
                      <li key={`${m.missionId}-${l.sequence}`}>
                        {l.originLabel ?? "—"} → {l.destinationLabel ?? "—"}
                        {l.departureLabel ? ` · leave ${l.departureLabel}` : ""}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {m.findings.length > 0 ? (
                  <ul>
                    {m.findings.slice(0, 4).map((f) => (
                      <li key={f.issueKey}>
                        {f.severityLabel}: {f.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link href={m.href}>Open Mission travel</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="briefing-footer muted">
        <p>Generated {model.generatedAt} · Manual travel data only · No routing</p>
      </footer>
    </article>
  );
}
