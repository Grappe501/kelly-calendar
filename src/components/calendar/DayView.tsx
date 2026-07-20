import Link from "next/link";
import { MissionCardView } from "@/components/today/MissionCardView";
import type { CalendarDayViewData } from "@/server/services/calendar-day-view-service";
import { CalendarDateNav } from "@/components/calendar/CalendarDateNav";
import { CalendarViewSwitcher } from "@/components/calendar/CalendarViewSwitcher";

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(utc);
}

function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Props = {
  data: CalendarDayViewData;
  focusEventId?: string | null;
};

export function DayView({ data, focusEventId = null }: Props) {
  const label = formatDayLabel(data.dateKey);
  const { readiness } = data;

  return (
    <div className="page-stack calendar-day-view">
      <header className="page-header">
        <h1>Calendar</h1>
        <p className="executive-question">{data.executiveQuestion}</p>
        <p className="muted">
          Engineering Track A · Day View · presentation only · {data.viewerDisplayName}
        </p>
      </header>

      <CalendarViewSwitcher active="day" dateKey={data.dateKey} />
      <CalendarDateNav
        dateKey={data.dateKey}
        view="day"
        label={label}
        isToday={data.isToday}
      />
      <p className="muted calendar-briefing-link">
        <Link href={`/system/briefing/${data.dateKey}`}>
          {data.isToday ? "Today’s Briefing" : "Campaign Day Briefing"}
        </Link>
        {" · "}
        <Link href={`/system/briefing/${data.dateKey}/launch`}>
          {data.isToday ? "Launch Today" : "Morning Launch Review"}
        </Link>
        {" · "}
        <Link href={`/system/briefing/${data.dateKey}/movement`}>
          Day Movement
        </Link>
        {" · "}
        <Link href={`/system/briefing/${data.dateKey}/logistics`}>
          Day Logistics
        </Link>
        {" · "}
        <Link href={`/system/briefing/${data.dateKey}/field-ops`}>
          Day Field Ops
        </Link>
        {" · "}
        <Link href={`/system/briefing/${data.dateKey}/incidents`}>
          Day Incidents
        </Link>
        {" · "}
        <Link href="/system/missions/command-center">Mission Command Center</Link>
      </p>

      <section className="panel" aria-labelledby="day-readiness-heading">
        <h2 id="day-readiness-heading">Readiness</h2>
        <p>
          <strong>
            {readiness.missionCount === 0
              ? "No missions"
              : readiness.blockedCount > 0
                ? "Blocked"
                : readiness.needsAttentionCount > 0
                  ? "Needs attention"
                  : readiness.unknownCount > 0
                    ? "Unknown present"
                    : "Ready"}
          </strong>
          <span className="muted">
            {" "}
            · Ready {readiness.readyCount} · Needs attention {readiness.needsAttentionCount} ·
            Blocked {readiness.blockedCount} · Unknown {readiness.unknownCount}
          </span>
        </p>
        {readiness.topIssue ? <p>Top issue: {readiness.topIssue}</p> : null}
        {readiness.nextAction ? (
          <p>
            Next action:{" "}
            <Link href={readiness.nextAction.href}>{readiness.nextAction.label}</Link>
          </p>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="day-schedule-heading">
        <h2 id="day-schedule-heading">Schedule</h2>
        {data.schedule.length === 0 ? (
          <p className="muted">No events for this day.</p>
        ) : (
          <ol className="calendar-day-schedule">
            {data.schedule.map((event) => (
              <li
                key={event.eventId}
                className={
                  focusEventId && event.eventId === focusEventId
                    ? "calendar-event-focused"
                    : undefined
                }
                data-event-focused={
                  focusEventId && event.eventId === focusEventId ? "true" : undefined
                }
              >
                <time dateTime={event.startsAt}>
                  {event.allDay
                    ? "All day"
                    : `${formatClock(event.startsAt, data.timezone)} – ${formatClock(event.endsAt, data.timezone)}`}
                </time>
                <div>
                  <span>{event.title}</span>
                  <p className="muted">
                    {event.primaryCalendar.name}
                    {event.location?.label ? ` · ${event.location.label}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel" aria-labelledby="day-missions-heading">
        <h2 id="day-missions-heading">Missions</h2>
        {data.missions.length === 0 ? (
          <p className="muted">No missions for this day.</p>
        ) : (
          <div className="mission-stack">
            {data.missions.map((mission) => (
              <MissionCardView
                key={mission.missionId}
                mission={mission}
                compact
                focused={Boolean(focusEventId && mission.missionId === focusEventId)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="day-conflicts-heading">
        <h2 id="day-conflicts-heading">Conflicts</h2>
        {data.conflicts.length === 0 ? (
          <p className="muted">No schedule overlaps detected for this day.</p>
        ) : (
          <ul>
            {data.conflicts.map((c) => (
              <li key={c.id}>
                <strong>{c.severity}</strong> — {c.explanation}
                {c.primaryEntity?.label && c.relatedEntity?.label
                  ? ` (${c.primaryEntity.label} ↔ ${c.relatedEntity.label})`
                  : null}
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Conflicts are signals for operators — not autonomous rescheduling.
        </p>
      </section>

      <section className="panel" aria-labelledby="day-brief-heading">
        <h2 id="day-brief-heading">Campaign brief</h2>
        <p className="muted">Day View links to the brief experience; it does not own brief truth.</p>
        <Link className="button" href="/brief">
          Open today&apos;s campaign brief
        </Link>
      </section>

      <section className="panel" aria-labelledby="day-reminders-heading">
        <h2 id="day-reminders-heading">Standing reminders</h2>
        <ul>
          {data.standingReminders.map((reminder) => (
            <li key={reminder}>{reminder}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="day-weather-heading">
        <h2 id="day-weather-heading">Weather</h2>
        <p className="muted">
          Future integration · Advisory Only · not canonical ({data.weatherStatus}).
        </p>
      </section>
    </div>
  );
}
