import Link from "next/link";
import { CalendarDateNav } from "@/components/calendar/CalendarDateNav";
import { CalendarViewSwitcher } from "@/components/calendar/CalendarViewSwitcher";
import { CalendarSearchChromeHost } from "@/components/calendar/search/CalendarSearchChromeHost";
import type { CalendarMonthViewData } from "@/server/services/calendar-month-view-service";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Props = {
  data: CalendarMonthViewData;
  focusEventId?: string | null;
};

export function MonthView({ data, focusEventId = null }: Props) {
  return (
    <div className="page-stack calendar-month-view">
      <header className="page-header calendar-hero">
        <p className="calendar-kicker">Month plan</p>
        <h1>{data.monthLabel}</h1>
        <p className="executive-question">{data.executiveQuestion}</p>
        <p className="muted">
          {data.scheduledEventCount} events · {data.campaignPhase}
          {data.majorFocus ? ` · Focus: ${data.majorFocus}` : ""}
        </p>
      </header>

      <CalendarViewSwitcher active="month" dateKey={data.dateKey} />
      <CalendarSearchChromeHost compact />
      <CalendarDateNav
        dateKey={data.monthStartKey}
        view="month"
        label={data.monthLabel}
        isToday={data.isCurrentMonth}
        mode="month"
      />

      <section className="panel" aria-labelledby="month-header-heading">
        <h2 id="month-header-heading">{data.monthLabel}</h2>
        <dl className="week-header-stats">
          <div>
            <dt>Election</dt>
            <dd>{data.electionLabel}</dd>
          </div>
          <div>
            <dt>Campaign phase</dt>
            <dd>{data.campaignPhase}</dd>
          </div>
          <div>
            <dt>Scheduled events</dt>
            <dd>
              {data.scheduledEventCount}
              {data.cataloguePartial ? " (catalogue may be partial)" : ""}
            </dd>
          </div>
          <div>
            <dt>Major focus</dt>
            <dd>{data.majorFocus ?? "Unknown from loaded month schedule"}</dd>
          </div>
        </dl>
      </section>

      <section className="panel" aria-labelledby="highlights-heading">
        <h2 id="highlights-heading">Campaign highlights</h2>
        {data.highlights.length === 0 ? (
          <p className="muted">No major milestones surfaced from loaded month events.</p>
        ) : (
          <ul className="month-highlights">
            {data.highlights.map((h) => (
              <li
                key={h.missionId}
                className={
                  focusEventId && h.missionId === focusEventId
                    ? "calendar-event-focused"
                    : undefined
                }
                data-event-focused={
                  focusEventId && h.missionId === focusEventId ? "true" : undefined
                }
              >
                <Link
                  href={`/events/${h.missionId}`}
                  aria-label={`${h.kind} — ${h.title}, ${h.whenLabel}`}
                >
                  <strong>{h.kind}</strong> — {h.title}
                </Link>
                <span className="muted"> · {h.whenLabel}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">Derived from canonical events — not separately owned objects.</p>
      </section>

      <section className="panel" aria-labelledby="month-grid-heading">
        <h2 id="month-grid-heading">Month grid</h2>
        <div className="month-grid-weekdays" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="month-grid" role="list">
          {data.grid.map((cell) => (
            <article
              key={cell.dateKey}
              role="listitem"
              className={[
                "month-day-cell",
                cell.inMonth ? "" : "month-day-outside",
                cell.isToday ? "month-day-today" : "",
                `month-density-${cell.density}`,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <header className="month-day-cell-header">
                <Link href={cell.dayHref} className="month-day-number" aria-label={`Open day ${cell.dateKey}`}>
                  {cell.dayNumber}
                </Link>
                <Link href={cell.weekHref} className="month-week-link" aria-label={`Open week containing ${cell.dateKey}`} title="Open week">
                  W
                </Link>
              </header>
              {cell.eventCount > 0 ? (
                <>
                  <p className="month-day-count">
                    {cell.eventCount} event{cell.eventCount === 1 ? "" : "s"}
                  </p>
                  <ul className="month-day-samples">
                    {cell.sampleEvents.map((sample) => (
                      <li key={sample.eventId}>
                        <Link
                          href={`/events/${sample.eventId}`}
                          aria-label={`${sample.title}, ${sample.timeLabel}`}
                        >
                          {sample.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="muted month-day-empty">·</p>
              )}
            </article>
          ))}
        </div>
        <p className="muted">
          Click any event title to open its full sheet. Day number opens Day View; W opens Week
          View.
        </p>
      </section>

      <section className="panel" aria-labelledby="rhythm-heading">
        <h2 id="rhythm-heading">Mission timeline</h2>
        <ol className="month-week-rhythm">
          {data.weekRhythm.map((week) => (
            <li key={week.weekStartKey}>
              <Link href={week.weekHref}>
                <strong>{week.weekLabel}</strong>
              </Link>
              <span>
                {" "}
                {week.focusTitle ?? "No focus surfaced"}{" "}
                <span className="muted">
                  ({week.eventCount} events
                  {week.peak === "overloaded"
                    ? " · overloaded"
                    : week.peak === "empty"
                      ? " · empty"
                      : ""}
                  )
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel" aria-labelledby="month-travel-heading">
        <h2 id="month-travel-heading">Travel overview</h2>
        <ul>
          <li>Missions with travel: {data.travel.missionsWithTravel}</li>
          <li>Travel days: {data.travel.travelDays}</li>
          <li>
            Known miles:{" "}
            {data.travel.knownMiles == null ? "Unknown" : `${data.travel.knownMiles} mi`}
            {data.travel.knownMilesPartial ? " (partial)" : ""}
          </li>
          <li>
            Overnight stays: {data.travel.overnightStays}
            {data.travel.overnightPartial ? " (partial)" : ""}
          </li>
          <li>Rental days: Unknown (not week/month-owned)</li>
          <li>Travel / schedule conflicts: {data.travel.conflictCount}</li>
          <li>Counties with geo signals: {data.travel.countyCount}</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="county-heat-heading">
        <h2 id="county-heat-heading">County activity</h2>
        {data.unknownCountyActivity ? (
          <p className="muted">County activity Unknown — no geo on loaded month missions.</p>
        ) : null}
        {data.countyHeat.length === 0 && !data.unknownCountyActivity ? (
          <p className="muted">No county activity in loaded month schedule.</p>
        ) : (
          <ul className="county-heat-list">
            {data.countyHeat.map((c) => (
              <li key={c.countyName} className={`county-heat-${c.heat}`}>
                <Link href={c.href}>
                  <strong>{c.countyName}</strong>
                </Link>
                <span className="muted">
                  {" "}
                  · {c.heat} · {c.eventCount} event{c.eventCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Heat is presentation density from mission geo.{" "}
          <Link href="/counties">County Operations</Link> remains the owner.
        </p>
      </section>

      <section className="panel" aria-labelledby="deadlines-heading">
        <h2 id="deadlines-heading">Upcoming deadlines</h2>
        {data.deadlines.length === 0 ? (
          <p className="muted">
            No deadline-titled events in loaded month schedule. Compliance / Petition owners remain
            authoritative for filing milestones.
          </p>
        ) : (
          <ul>
            {data.deadlines.map((d) => (
              <li key={`${d.missionId}-${d.dateKey}`}>
                <strong>{d.dateKey}</strong> — {d.title}
                <span className="muted"> · {d.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="month-brief-heading">
        <h2 id="month-brief-heading">Monthly campaign brief</h2>
        <ul>
          <li>
            <strong>Biggest opportunity:</strong>{" "}
            {data.brief.opportunities ?? "Unknown from loaded schedule"}
          </li>
          <li>
            <strong>Largest risks:</strong> {data.brief.risks}
          </li>
          <li>
            <strong>Priorities:</strong> {data.brief.priorities ?? "Unknown from loaded schedule"}
          </li>
          <li>
            <strong>Pending decisions:</strong> {data.brief.pendingDecisions}
          </li>
        </ul>
        <div className="button-row">
          <Link className="button" href={data.brief.briefHref}>
            Open campaign brief
          </Link>
          <Link className="button button-secondary" href={data.brief.commandHref}>
            Executive command
          </Link>
        </div>
      </section>
    </div>
  );
}
