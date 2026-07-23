import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPrintButton } from "@/components/calendar/CalendarPrintButton";
import { resolveCalendarDateKey } from "@/lib/calendar/chicago-date";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getWeekPrintProjection } from "@/server/services/calendar-print-service";

export const metadata: Metadata = {
  title: "Print week overview",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ date: string }>;
};

function formatDayHeading(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(utc);
}

export default async function CalendarPrintWeekPage({ params }: Ctx) {
  const actor = await requireActiveAuthenticatedActor();
  const { date: rawDate } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) notFound();
  const dateKey = resolveCalendarDateKey(rawDate);

  const projection = await getWeekPrintProjection({
    actor,
    dateKey,
    profile: "WEEK_OVERVIEW",
  });

  return (
    <article className="calendar-print-sheet page-stack">
      <header className="page-header">
        <p className="calendar-kicker">Kelly Campaign Command Calendar</p>
        <h1>Week overview</h1>
        <p>
          Profile{" "}
          <span className="status-pill">{projection.profile}</span> ·{" "}
          {projection.weekKeys[0]} →{" "}
          {projection.weekKeys[projection.weekKeys.length - 1]}
          {projection.truncated ? " · truncated" : null}
        </p>
        <div className="no-print button-row">
          <CalendarPrintButton />
          <Link
            className="chip chip-link touch-target"
            href={`/system/calendar/print/preview?date=${dateKey}&view=week&profile=WEEK_OVERVIEW`}
          >
            Preview options
          </Link>
        </div>
      </header>

      <div className="print-week-grid">
        {projection.days.map((day) => (
          <section key={day.dateKey} className="print-week-day">
            <h2>{formatDayHeading(day.dateKey)}</h2>
            {day.events.length === 0 ? (
              <p className="muted">—</p>
            ) : (
              <ul className="print-event-list">
                {day.events.map((event) => (
                  <li key={`${day.dateKey}-${event.eventId}`} className="print-event-row">
                    <strong>{event.title}</strong>{" "}
                    <span className="status-pill" data-status={event.status}>
                      {event.status}
                    </span>
                    {event.locationLabel ? (
                      <span className="muted"> · {event.locationLabel}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className="print-confidentiality">
        <p>
          Confidential week overview. Titles, city, and status only. Do not add
          street addresses or private notes when reprinting.
        </p>
      </footer>
    </article>
  );
}
