import Link from "next/link";
import type { TodayCommandShellData } from "@/server/services/command-summary-today";

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

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
  const { summary, nextEvent, upcomingToday, viewerDisplayName } = data;
  const tz = summary.timezone;

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

      <section className="panel" aria-labelledby="next-heading">
        <h2 id="next-heading">Next</h2>
        {nextEvent ? (
          <article className="command-event-card">
            <p className="command-event-time">
              {formatTime(nextEvent.startsAt, tz)}
              {" – "}
              {formatTime(nextEvent.endsAt, tz)}
            </p>
            <h3 className="command-event-title">{nextEvent.title}</h3>
            <p className="muted">
              {nextEvent.primaryCalendar.name}
              {nextEvent.location?.label ? ` · ${nextEvent.location.label}` : ""}
            </p>
            <p className="muted">Status: {nextEvent.status}</p>
            {nextEvent.canOpen ? (
              <div className="button-row">
                <Link className="button" href={`/calendar?event=${nextEvent.eventId}`}>
                  Open in calendar
                </Link>
              </div>
            ) : null}
          </article>
        ) : (
          <div className="empty-state">
            <strong>No upcoming event on today’s schedule.</strong>
            <p className="muted">
              Add an event or check the full calendar. Candidate PII remains disabled
              until separately certified.
            </p>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="counts-heading">
        <h2 id="counts-heading">Today at a glance</h2>
        <ul className="command-count-grid" aria-label="Today counts">
          <li>
            <strong>{summary.counts.eventsToday}</strong>
            <span className="muted">Events today</span>
          </li>
          <li>
            <strong>{summary.counts.eventsTomorrow}</strong>
            <span className="muted">Tomorrow</span>
          </li>
          <li>
            <strong>{summary.counts.criticalConflicts}</strong>
            <span className="muted">Critical conflicts</span>
          </li>
          <li>
            <strong>{summary.counts.highRiskEvents}</strong>
            <span className="muted">At risk</span>
          </li>
        </ul>
        <p className="muted">
          Conflict and readiness depth expands in Step 8. This shell uses live safe
          projections only.
        </p>
      </section>

      <section className="panel" aria-labelledby="today-heading">
        <h2 id="today-heading">Remaining today</h2>
        {upcomingToday.length === 0 ? (
          <p className="muted">No remaining events for the rest of today.</p>
        ) : (
          <ul className="command-event-list">
            {upcomingToday.map((event) => (
              <li key={event.eventId} className="command-event-card">
                <p className="command-event-time">
                  {formatTime(event.startsAt, tz)} · {event.status}
                </p>
                <p className="command-event-title">{event.title}</p>
                <p className="muted">{event.primaryCalendar.name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="actions-heading">
        <h2 id="actions-heading">Quick actions</h2>
        <div className="button-row">
          <Link className="button" href="/add">
            Add event
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
