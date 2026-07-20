import Link from "next/link";
import type { DayLogisticsBoardView } from "@/lib/missions/v21/logistics-pack";

type Props = { model: DayLogisticsBoardView };

export function DayLogisticsBoard({ model }: Props) {
  return (
    <article className="page-stack day-logistics-board">
      <header className="briefing-header">
        <h1>Day Logistics Board</h1>
        <p className="executive-question">
          Review field kits, pack owners, handoffs, and logistics readiness for
          the campaign day.
        </p>
        <p className="briefing-date-line">{model.dateLabel}</p>
        <p className="muted">
          {model.timezone}
          {model.isToday ? " · Today" : model.isPast ? " · Past day" : " · Future day"}
        </p>
        <p role="note">
          Logistics planning does not start Mission execution or launch the
          campaign day.
        </p>
        <nav className="briefing-nav" aria-label="Logistics navigation">
          <Link href={model.navigation.previousHref ?? "#"}>Previous</Link>
          <Link href={model.navigation.todayHref}>Today</Link>
          <Link href={model.navigation.nextHref ?? "#"}>Next</Link>
          <Link href={model.navigation.briefingHref}>Briefing</Link>
          <Link href={model.navigation.movementHref}>Day Movement</Link>
          <Link href={`/system/briefing/${model.campaignDate}/field-ops`}>
            Day Field Ops
          </Link>
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

      <section className="panel" aria-labelledby="logistics-sum-h">
        <h2 id="logistics-sum-h">Summary</h2>
        <ul className="briefing-fact-list">
          <li>{model.summary.missionCount} Missions</li>
          <li>{model.summary.withPackCount} with logistics packs</li>
          <li>{model.summary.withoutPackCount} without packs</li>
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
            There is no Mission logistics to review for this campaign day.
          </p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="logistics-list-h">
          <h2 id="logistics-list-h">Chronological logistics</h2>
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
                  {m.packExists ? "" : " · No pack"}
                </p>
                <dl className="briefing-dl">
                  <dt>Pack owner</dt>
                  <dd>{m.packOwnerName ?? "Not set"}</dd>
                  <dt>Items</dt>
                  <dd>{m.itemCount}</dd>
                  <dt>Open handoffs</dt>
                  <dd>{m.openHandoffCount}</dd>
                  <dt>Outstanding returns</dt>
                  <dd>{m.outstandingReturnCount}</dd>
                  <dt>Travel departure</dt>
                  <dd>{m.travelDepartureLabel ?? "Not set"}</dd>
                  <dt>Logistics required</dt>
                  <dd>
                    {m.logisticsRequiredExplicit === true
                      ? "Yes (explicit)"
                      : m.logisticsRequiredExplicit === false
                        ? "No (explicit)"
                        : "From materials signal"}
                  </dd>
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
                  <Link href={m.href}>Open Mission logistics</Link>
                  {" · "}
                  <Link href={m.travelHref}>Open Mission travel</Link>
                  {" · "}
                  <Link href={`/system/missions/${m.missionId}/field-ops`}>
                    Open Mission field ops
                  </Link>
                  {" · "}
                  <Link href={`/system/missions/${m.missionId}/staffing`}>
                    Open Mission staffing
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="briefing-footer muted">
        <p>
          Generated {model.generatedAt} · Manual logistics data only · No
          inventory system
        </p>
      </footer>
    </article>
  );
}
