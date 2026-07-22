import Link from "next/link";
import { CalendarDateNav } from "@/components/calendar/CalendarDateNav";
import { CalendarViewSwitcher } from "@/components/calendar/CalendarViewSwitcher";
import type { CalendarWeekViewData } from "@/server/services/calendar-week-view-service";

function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Props = {
  data: CalendarWeekViewData;
  focusEventId?: string | null;
};

export function WeekView({ data, focusEventId = null }: Props) {
  const readiness = data.scheduleReadiness;
  const readyPct =
    readiness.missionCount === 0
      ? null
      : Math.round((readiness.readyCount / readiness.missionCount) * 100);

  return (
    <div className="page-stack calendar-week-view">
      <header className="page-header calendar-hero">
        <p className="calendar-kicker">Campaign week {data.campaignWeekDisplay}</p>
        <h1>{data.weekRangeLabel}</h1>
        <p className="executive-question">{data.executiveQuestion}</p>
        <p className="muted">
          {readyPct == null
            ? "No missions loaded this week"
            : `${readyPct}% ready · ${data.highPriorityTitle ?? "No high-priority title surfaced"}`}
        </p>
      </header>

      <CalendarViewSwitcher active="week" dateKey={data.dateKey} />
      <CalendarDateNav
        dateKey={data.weekStartKey}
        view="week"
        label={data.weekRangeLabel}
        isToday={data.isCurrentWeek}
        stepDays={7}
      />

      <section className="panel panel-hero" aria-labelledby="week-grid-heading">
        <h2 id="week-grid-heading">This week</h2>
        <div className="week-grid" role="list">
          {data.days.map((day) => (
            <article
              key={day.dateKey}
              className={`week-day-column${day.isToday ? " week-day-today" : ""}`}
              role="listitem"
            >
              <header>
                <Link href={`/calendar?view=day&date=${day.dateKey}`}>
                  <strong>{day.weekdayLabel}</strong>
                  <span className="muted"> {day.dateKey.slice(5)}</span>
                </Link>
              </header>
              {day.events.length === 0 ? (
                <p className="muted week-day-empty">Open</p>
              ) : (
                <ul className="week-day-events">
                  {day.events.map((event) => (
                    <li
                      key={event.eventId}
                      className={
                        focusEventId && event.eventId === focusEventId
                          ? "calendar-event-focused"
                          : undefined
                      }
                    >
                      <span className="week-event-time">
                        {event.allDay ? "All day" : formatClock(event.startsAt, data.timezone)}
                      </span>
                      <Link href={`/events/${event.eventId}`} className="week-event-title">
                        {event.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      {data.missionRail.length > 0 ? (
        <section className="panel" aria-labelledby="mission-rail-heading">
          <h2 id="mission-rail-heading">Priority missions</h2>
          <ol className="mission-rail">
            {data.missionRail.map((item) => (
              <li key={item.missionId}>
                <Link href={`/events/${item.missionId}`}>
                  <strong>{item.title}</strong>
                </Link>
                <p className="muted">
                  {item.whenLabel} · {item.readinessLabel}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {data.campaignThemes.length > 0 ? (
        <section className="panel" aria-labelledby="week-themes-heading">
          <h2 id="week-themes-heading">Themes</h2>
          <ul className="week-campaign-themes">
            {data.campaignThemes.map((theme) => (
              <li key={theme.id}>
                <strong>{theme.label}</strong>
                <span className="muted"> · {theme.eventCount}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="panel calendar-more-tools">
        <summary>Travel, counties &amp; modules</summary>
        <ul>
          <li>Missions with travel: {data.travel.missionsWithTravel}</li>
          <li>Overlap conflicts: {data.travel.conflictCount}</li>
        </ul>
        {data.counties.length > 0 ? (
          <ul className="county-activity-list">
            {data.counties.map((c) => (
              <li key={c.countyName}>
                <Link href={c.href}>
                  <strong>{c.countyName}</strong>
                </Link>
                <span className="muted"> · {c.eventCount}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="button-row tools-grid">
          {data.domainStrip.slice(0, 6).map((tile) => (
            <Link key={tile.id} className="button secondary" href={tile.href}>
              {tile.label}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
