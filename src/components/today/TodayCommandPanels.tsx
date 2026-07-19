import Link from "next/link";
import { MissionCardView } from "@/components/today/MissionCardView";
import { TodayReadinessPanel } from "@/components/today/TodayReadinessPanel";
import type { TodayCommandShellData } from "@/server/services/command-summary-today";

type Props = {
  data: TodayCommandShellData;
  todayLabel: string;
  countdownLabel: string;
  appName: string;
  /** When true, omit outer page-stack wrapper (parent already provides it). */
  nested?: boolean;
};

export function TodayCommandPanels({
  data,
  todayLabel,
  countdownLabel,
  appName,
  nested = false,
}: Props) {
  const { summary, todayReadiness, nextMission, missionsToday, viewerDisplayName } =
    data;

  const body = (
    <>
      <header className="page-header">
        <p className="muted">{appName}</p>
        <h1>Command · Today</h1>
        <p>
          {todayLabel}
          <br />
          {countdownLabel}
        </p>
        <p className="muted">Signed in as {viewerDisplayName}</p>
      </header>

      <TodayReadinessPanel readiness={todayReadiness} />

      <section className="panel" aria-labelledby="next-mission-heading">
        <h2 id="next-mission-heading">Next mission</h2>
        {nextMission ? (
          <MissionCardView mission={nextMission} />
        ) : (
          <div className="empty-state">
            <strong>No upcoming mission on today’s schedule.</strong>
            <p className="muted">
              Add a mission or check the full calendar. Candidate PII remains disabled
              until separately certified.
            </p>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="counts-heading">
        <h2 id="counts-heading">Today at a glance</h2>
        <ul className="command-count-grid" aria-label="Today mission counts">
          <li>
            <strong>{summary.counts.eventsToday}</strong>
            <span className="muted">Missions today</span>
          </li>
          <li>
            <strong>{summary.counts.eventsTomorrow}</strong>
            <span className="muted">Tomorrow</span>
          </li>
          <li>
            <strong>{todayReadiness.blockedCount}</strong>
            <span className="muted">Blocked</span>
          </li>
          <li>
            <strong>{todayReadiness.needsAttentionCount}</strong>
            <span className="muted">Needs attention</span>
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="missions-heading">
        <h2 id="missions-heading">Later today</h2>
        {missionsToday.filter((m) => !m.isNext).length === 0 ? (
          <p className="muted">No later missions after the next one.</p>
        ) : (
          <ul className="command-event-list">
            {missionsToday
              .filter((m) => !m.isNext)
              .map((mission) => (
                <li key={mission.missionId}>
                  <MissionCardView mission={mission} compact />
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="actions-heading">
        <h2 id="actions-heading">Quick actions</h2>
        <div className="button-row">
          <Link className="button" href="/command">
            Executive Command
          </Link>
          <Link className="button secondary" href="/field">
            Field Ops
          </Link>
          <Link className="button secondary" href="/counties">
            Counties
          </Link>
          <Link className="button secondary" href="/brief">
            Campaign Brief
          </Link>
          <Link className="button" href="/add">
            Add mission
          </Link>
          <Link className="button secondary" href="/search">
            Search
          </Link>
          <Link className="button secondary" href="/calendar">
            Calendar
          </Link>
          <Link className="button secondary" href="/more">
            More
          </Link>
        </div>
      </section>
    </>
  );

  if (nested) return body;
  return <div className="page-stack">{body}</div>;
}
