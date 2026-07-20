import Link from "next/link";
import type { DayStaffingBoardView } from "@/lib/missions/v21/staffing/build-view-model";

type Props = { model: DayStaffingBoardView };

export function DayStaffingBoard({ model }: Props) {
  return (
    <article className="page-stack day-staffing-board">
      <header className="briefing-header">
        <h1>Day Staffing Board</h1>
        <p className="executive-question">
          Review volunteer staffing coverage, gaps, and readiness for the
          campaign day.
        </p>
        <p className="briefing-date-line">{model.dateLabel}</p>
        <p className="muted">
          {model.campaignTimezone}
          {model.isToday
            ? " · Today"
            : model.isPast
              ? " · Past day"
              : " · Future day"}
        </p>
        <p role="note">
          RSVP ≠ assignment ≠ check-in ≠ Execute. Aggregate labels only — no
          contact fields.
        </p>
        <nav className="briefing-nav" aria-label="Staffing navigation">
          <Link href={model.navigation.previousHref}>Previous</Link>
          <Link href={model.navigation.todayHref}>Today</Link>
          <Link href={model.navigation.nextHref}>Next</Link>
          <Link href={model.navigation.briefingHref}>Briefing</Link>
          <Link href={model.navigation.movementHref}>Day Movement</Link>
          <Link href={model.navigation.logisticsHref}>Day Logistics</Link>
          <Link href={model.navigation.fieldOpsHref}>Day Field Ops</Link>
          <Link href={`/system/briefing/${model.campaignDateKey}/incidents`}>
            Day Incidents
          </Link>
          <Link href={model.navigation.launchHref}>Launch Review</Link>
          <Link href={model.navigation.closeoutHref}>Closeout</Link>
          <Link href={model.navigation.commandCenterHref}>Command Center</Link>
          <Link href={model.navigation.reportHref}>Report</Link>
        </nav>
      </header>

      <section className="panel" aria-labelledby="staffing-sum-h">
        <h2 id="staffing-sum-h">Summary</h2>
        <ul className="briefing-fact-list">
          <li>{model.summary.missionCount} Missions</li>
          <li>{model.summary.withPlanCount} with staffing plans</li>
          <li>{model.summary.withoutPlanCount} without plans</li>
          <li>{model.summary.blockerCount} blockers</li>
          <li>{model.summary.warningCount} warnings</li>
          <li>Minimum gaps (total): {model.summary.totalGapCount}</li>
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
            There is no Mission staffing to review for this campaign day.
          </p>
        </section>
      ) : (
        <section className="panel" aria-labelledby="staffing-list-h">
          <h2 id="staffing-list-h">Chronological staffing</h2>
          <ul className="briefing-list">
            {model.missions.map((m) => (
              <li key={m.missionId}>
                <h3>
                  {m.title}
                  {m.isFirst ? " · First" : ""}
                  {m.isPrimary ? " · Primary" : ""}
                  {m.isCancelled ? " · Cancelled" : ""}
                </h3>
                <p className="muted">{m.whenLabel}</p>
                <p>
                  Readiness: <strong>{m.readinessLabel}</strong>
                  {m.planStatusLabel
                    ? ` · Plan: ${m.planStatusLabel}`
                    : " · No plan"}
                  {m.isStale ? " · Stale" : ""}
                </p>
                <dl className="briefing-dl">
                  <dt>Blockers</dt>
                  <dd>{m.findingCounts.blockers}</dd>
                  <dt>Warnings</dt>
                  <dd>{m.findingCounts.warnings}</dd>
                  <dt>Minimum gap</dt>
                  <dd>{m.totalGap}</dd>
                  <dt>Staffing required</dt>
                  <dd>{m.staffingRequired ? "Yes" : "No"}</dd>
                </dl>
                {m.coverage.length > 0 ? (
                  <ul>
                    {m.coverage.map((row) => (
                      <li key={row.requirementId}>
                        {row.roleLabel}: confirmed {row.confirmed}/
                        {row.requiredCount}
                        {row.remainingMinimumGap > 0
                          ? ` · min gap ${row.remainingMinimumGap}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No requirements defined.</p>
                )}
                <p>
                  <Link href={m.staffingHref}>Open Mission staffing</Link>
                  {" · "}
                  <Link href={m.fieldOpsHref}>Open Mission field ops</Link>
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
          Generated {model.generatedAt} · Staffing does not mutate Execute,
          Field Ops, or Mobilize attendance
        </p>
      </footer>
    </article>
  );
}
