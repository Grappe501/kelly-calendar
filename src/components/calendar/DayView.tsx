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

function calendarTone(type: string): string {
  const t = type.toUpperCase();
  if (t.includes("TRAVEL")) return "tone-travel";
  if (t.includes("FIELD") || t.includes("COUNTY")) return "tone-field";
  if (t.includes("FUNDRAIS")) return "tone-fundraising";
  if (t.includes("PROTECT") || t.includes("PERSONAL")) return "tone-personal";
  if (t.includes("PUBLIC") || t.includes("EVENT")) return "tone-public";
  return "tone-default";
}

type Props = {
  data: CalendarDayViewData;
  focusEventId?: string | null;
};

export function DayView({ data, focusEventId = null }: Props) {
  const label = formatDayLabel(data.dateKey);
  const { readiness } = data;
  const readinessLabel =
    readiness.missionCount === 0
      ? "No missions"
      : readiness.blockedCount > 0
        ? "Blocked"
        : readiness.needsAttentionCount > 0
          ? "Needs attention"
          : readiness.unknownCount > 0
            ? "Unknown present"
            : "Ready";

  return (
    <div className="page-stack calendar-day-view">
      <header className="page-header calendar-hero">
        <p className="calendar-kicker">{data.isToday ? "Today’s schedule" : "Day schedule"}</p>
        <h1>{label}</h1>
        <p className="executive-question">{data.executiveQuestion}</p>
      </header>

      <CalendarViewSwitcher active="day" dateKey={data.dateKey} />
      <CalendarDateNav
        dateKey={data.dateKey}
        view="day"
        label={label}
        isToday={data.isToday}
      />

      <section className="panel panel-hero" aria-labelledby="day-schedule-heading">
        <div className="panel-hero-head">
          <h2 id="day-schedule-heading">Schedule</h2>
          <span className={`status-pill status-${readinessLabel.toLowerCase().replace(/\s+/g, "-")}`}>
            {readinessLabel}
          </span>
        </div>
        {data.schedule.length === 0 ? (
          <p className="muted">No events for this day. Add one from Upload.</p>
        ) : (
          <ol className="calendar-day-schedule">
            {data.schedule.map((event) => (
              <li
                key={event.eventId}
                className={`schedule-event-card ${calendarTone(event.primaryCalendar.type)}${
                  focusEventId && event.eventId === focusEventId
                    ? " calendar-event-focused"
                    : ""
                }`}
              >
                <Link href={`/events/${event.eventId}`} className="schedule-event-link">
                  <time dateTime={event.startsAt}>
                    {event.allDay
                      ? "All day"
                      : `${formatClock(event.startsAt, data.timezone)} – ${formatClock(event.endsAt, data.timezone)}`}
                  </time>
                  <div>
                    <strong className="schedule-event-title">{event.title}</strong>
                    <p className="muted">
                      {event.primaryCalendar.name}
                      {event.location?.label ? ` · ${event.location.label}` : ""}
                    </p>
                    {event.travel?.departureAt || event.travel?.travelRequired ? (
                      <p className="muted">
                        Travel{" "}
                        {event.travel.departureAt
                          ? `leave ${formatClock(event.travel.departureAt, data.timezone)}`
                          : "required"}
                      </p>
                    ) : null}
                  </div>
                </Link>
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
              <MissionCardView key={mission.missionId} mission={mission} />
            ))}
          </div>
        )}
      </section>

      {data.conflicts.length > 0 ? (
        <section className="panel panel-alert" aria-labelledby="day-conflicts-heading">
          <h2 id="day-conflicts-heading">Conflicts</h2>
          <ul className="conflict-list">
            {data.conflicts.map((c) => (
              <li key={c.id}>
                <strong>{c.primaryEntity.label}</strong>
                {c.relatedEntity ? (
                  <span className="muted"> ∩ {c.relatedEntity.label}</span>
                ) : null}
                <p className="muted">{c.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="panel calendar-more-tools">
        <summary>Briefing &amp; day tools</summary>
        <div className="button-row tools-grid">
          <Link className="button secondary" href={`/system/briefing/${data.dateKey}`}>
            Day briefing
          </Link>
          <Link className="button secondary" href={`/system/briefing/${data.dateKey}/launch`}>
            Morning launch
          </Link>
          <Link className="button secondary" href={`/system/briefing/${data.dateKey}/movement`}>
            Movement
          </Link>
          <Link className="button secondary" href={`/system/briefing/${data.dateKey}/logistics`}>
            Logistics
          </Link>
          <Link className="button secondary" href={`/system/briefing/${data.dateKey}/field-ops`}>
            Field ops
          </Link>
          <Link className="button secondary" href="/upload">
            Upload / add
          </Link>
        </div>
      </details>
    </div>
  );
}
