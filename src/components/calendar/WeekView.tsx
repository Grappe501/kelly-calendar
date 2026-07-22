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
      <header className="page-header">
        <h1>Calendar</h1>
        <p className="executive-question">{data.executiveQuestion}</p>
        <p className="muted">
          Engineering Track A · Week View · presentation only · {data.viewerDisplayName}
        </p>
      </header>

      <CalendarViewSwitcher active="week" dateKey={data.dateKey} />
      <CalendarDateNav
        dateKey={data.weekStartKey}
        view="week"
        label={`${data.weekRangeLabel} · Campaign week ${data.campaignWeekDisplay}`}
        isToday={data.isCurrentWeek}
        stepDays={7}
      />

      <section className="panel week-header-panel" aria-labelledby="week-header-heading">
        <h2 id="week-header-heading">Campaign week {data.campaignWeekDisplay}</h2>
        <dl className="week-header-stats">
          <div>
            <dt>Election</dt>
            <dd>{data.electionLabel}</dd>
          </div>
          <div>
            <dt>Schedule readiness</dt>
            <dd>
              {readyPct == null ? "No missions loaded" : `${readyPct}% ready of loaded missions`}
              <span className="muted">
                {" "}
                · Ready {readiness.readyCount} · Attention {readiness.needsAttentionCount} ·
                Blocked {readiness.blockedCount} · Unknown {readiness.unknownCount}
              </span>
            </dd>
          </div>
          <div>
            <dt>High priority</dt>
            <dd>{data.highPriorityTitle ?? "None surfaced from this week’s schedule"}</dd>
          </div>
        </dl>
        <p className="muted">
          Campaign week index is display-only (not a canonical registry). Schedule readiness is
          rolled up from loaded week missions — not a domain owner.
        </p>
        {data.cataloguePartial ? (
          <p className="muted">
            Event catalogue may be partial (loader cap). Treat empty days as Unknown, not proof of
            no activity.
          </p>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="domain-strip-heading">
        <h2 id="domain-strip-heading">Mission readiness strip</h2>
        <p className="muted">
          Week-scoped domain rollups are not available. Tiles stay Unknown and link to owning
          modules for today’s canonical readiness.
        </p>
        <ul className="domain-strip">
          {data.domainStrip.map((tile) => (
            <li key={tile.id}>
              <Link href={tile.href} className="domain-tile" title={tile.reason}>
                <span className="domain-tile-label">{tile.label}</span>
                <span className="domain-tile-state">Unknown</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="week-themes-heading">
        <h2 id="week-themes-heading">What this week is trying to accomplish</h2>
        {data.campaignThemes.length === 0 ? (
          <p className="muted">No campaign themes classified from this week’s loaded events.</p>
        ) : (
          <ul className="week-campaign-themes">
            {data.campaignThemes.map((theme) => (
              <li key={theme.id}>
                <strong>{theme.label}</strong>
                <span className="muted">
                  {" "}
                  · {theme.eventCount} · {theme.sampleTitles.join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="week-grid-heading">
        <h2 id="week-grid-heading">Week calendar</h2>
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
                <p className="muted week-day-empty">—</p>
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
                      data-event-focused={
                        focusEventId && event.eventId === focusEventId
                          ? "true"
                          : undefined
                      }
                    >
                      <span className="week-event-time">
                        {event.allDay ? "All day" : formatClock(event.startsAt, data.timezone)}
                      </span>
                      <Link
                        href={`/events/${event.eventId}`}
                        className="week-event-title"
                      >
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

      <section className="panel" aria-labelledby="mission-rail-heading">
        <h2 id="mission-rail-heading">Weekly mission rail</h2>
        {data.missionRail.length === 0 ? (
          <p className="muted">No mission priorities surfaced from this week’s loaded schedule.</p>
        ) : (
          <ol className="mission-rail">
            {data.missionRail.map((item) => (
              <li key={item.missionId}>
                <Link href={`/events/${item.missionId}`}>
                  <strong>Priority {item.priority}</strong> {item.title}
                </Link>
                <p className="muted">
                  {item.whenLabel} · {item.readinessLabel} · {item.riskLevel}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="muted">Derived from existing mission cards — not a new ownership object.</p>
      </section>

      <section className="panel" aria-labelledby="travel-heading">
        <h2 id="travel-heading">Travel</h2>
        <ul>
          <li>Missions with travel: {data.travel.missionsWithTravel}</li>
          <li>
            Known drive time:{" "}
            {data.travel.knownDriveMinutes == null
              ? "Unknown"
              : `${data.travel.knownDriveMinutes} min`}
            {data.travel.knownDriveMinutesPartial ? " (partial)" : ""}
          </li>
          <li>
            Known miles:{" "}
            {data.travel.knownMiles == null ? "Unknown" : `${data.travel.knownMiles} mi`}
            {data.travel.knownMilesPartial ? " (partial)" : ""}
          </li>
          <li>
            Overnight stays: {data.travel.overnightStays}
            {data.travel.overnightPartial ? " (partial)" : ""}
          </li>
          <li>Schedule overlap conflicts: {data.travel.conflictCount}</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="county-heading">
        <h2 id="county-heading">County activity</h2>
        {data.counties.length === 0 ? (
          <p className="muted">No county geo on loaded week missions.</p>
        ) : (
          <ul className="county-activity-list">
            {data.counties.map((c) => (
              <li key={c.countyName}>
                <Link href={c.href}>
                  <strong>{c.countyName}</strong>
                </Link>
                <span className="muted">
                  {" "}
                  · {c.eventCount} event{c.eventCount === 1 ? "" : "s"} · {c.sampleTitle}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Snapshot from mission geo this week. County Operations remains the owner —{" "}
          <Link href="/counties">open County module</Link>.
        </p>
      </section>

      <section className="panel" aria-labelledby="candidate-heading">
        <h2 id="candidate-heading">Candidate schedule</h2>
        {data.candidateSchedule.length === 0 ? (
          <p className="muted">No candidate-facing activities classified in loaded week events.</p>
        ) : (
          <ul>
            {data.candidateSchedule.map((item) => (
              <li key={item.missionId}>
                <Link href={item.href}>{item.title}</Link>
                <span className="muted">
                  {" "}
                  · {item.whenLabel} · {item.kind}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="volunteer-heading">
        <h2 id="volunteer-heading">Volunteer operations</h2>
        <ul>
          <li>Missions with staffing signals: {data.volunteer.missionsWithStaffing}</li>
          <li>
            Staff assigned / required:{" "}
            {data.volunteer.staffAssignedTotal == null
              ? "Unknown"
              : data.volunteer.staffAssignedTotal}
            {" / "}
            {data.volunteer.staffRequiredTotal == null
              ? "Unknown"
              : data.volunteer.staffRequiredTotal}
          </li>
          <li>Volunteer lead gaps: {data.volunteer.volunteerLeadGaps}</li>
          <li>Shortages: {data.volunteer.shortages}</li>
        </ul>
        <p className="muted">
          {data.volunteer.note}{" "}
          <Link href="/volunteers">Open Volunteer Operations</Link>.
        </p>
      </section>

      <section className="panel" aria-labelledby="week-brief-heading">
        <h2 id="week-brief-heading">Weekly campaign brief</h2>
        <ul>
          <li>
            <strong>What changed?</strong> {data.brief.whatChanged}
          </li>
          <li>
            <strong>Most important:</strong>{" "}
            {data.brief.mostImportant ?? "Unknown from loaded schedule"}
          </li>
          <li>
            <strong>Risks:</strong> {data.brief.riskCount} surfaced (overlaps + blocked)
          </li>
          <li>
            <strong>Pending decisions:</strong> {data.brief.pendingDecisions}
          </li>
        </ul>
        <Link className="button" href={data.brief.fullBriefHref}>
          Open full executive brief
        </Link>
      </section>

      <section className="panel" aria-labelledby="reminders-heading">
        <h2 id="reminders-heading">Standing reminders</h2>
        <ul>
          {data.standingReminders.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      {data.conflicts.length > 0 ? (
        <section className="panel" aria-labelledby="week-conflicts-heading">
          <h2 id="week-conflicts-heading">Conflicts</h2>
          <ul>
            {data.conflicts.map((c) => (
              <li key={c.id}>
                <strong>{c.severity}</strong> — {c.explanation}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
