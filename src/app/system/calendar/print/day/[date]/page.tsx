import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPrintButton } from "@/components/calendar/CalendarPrintButton";
import { resolveCalendarDateKey } from "@/lib/calendar/chicago-date";
import { isPrintProfile, type PrintProfile } from "@/lib/calendar/print";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getDayPrintProjection } from "@/server/services/calendar-print-service";

export const metadata: Metadata = {
  title: "Print day sheet",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ date: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

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

export default async function CalendarPrintDayPage({
  params,
  searchParams,
}: Ctx) {
  const actor = await requireActiveAuthenticatedActor();
  const { date: rawDate } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) notFound();
  const dateKey = resolveCalendarDateKey(rawDate);
  const sp = await searchParams;
  const profileRaw = first(sp.profile);
  const profile: PrintProfile = isPrintProfile(profileRaw)
    ? profileRaw
    : "DAY_OPERATIONS_REDACTED";

  const projection = await getDayPrintProjection({
    actor,
    dateKey,
    profile,
  });

  return (
    <article className="calendar-print-sheet page-stack">
      <header className="page-header">
        <p className="calendar-kicker">Kelly Campaign Command Calendar</p>
        <h1>Day sheet — {formatDayLabel(projection.dateKey)}</h1>
        <p>
          Profile <span className="status-pill">{projection.profile}</span> ·{" "}
          {projection.timezone}
          {projection.truncated ? " · truncated" : null}
        </p>
        <div className="no-print button-row">
          <CalendarPrintButton />
          <Link
            className="chip chip-link touch-target"
            href={`/system/calendar/print/preview?date=${dateKey}&view=day&profile=${encodeURIComponent(profile)}`}
          >
            Preview options
          </Link>
        </div>
      </header>

      {projection.events.length === 0 ? (
        <p className="muted">No printable events for this day.</p>
      ) : (
        <ol className="print-event-list">
          {projection.events.map((event) => (
            <li key={event.eventId} className="print-event-row">
              <div className="print-event-time">
                {event.isAllDay
                  ? "All day"
                  : `${formatClock(event.startsAt, event.timezone)} – ${formatClock(event.endsAt, event.timezone)}`}
              </div>
              <div className="print-event-body">
                <h2>{event.title}</h2>
                <p>
                  <span className="status-pill" data-status={event.status}>
                    {event.status}
                  </span>
                  {event.locationLabel ? ` · ${event.locationLabel}` : null}
                  {event.calendarName ? ` · ${event.calendarName}` : null}
                </p>
                <p className="muted">
                  #{event.eventNumber}
                  {event.isOvernight ? " · Overnight" : null}
                  {event.continuesFromPrior ? " · Continues from prior day" : null}
                  {event.continuesIntoNext ? " · Continues into next day" : null}
                  {event.missionLinked ? " · Mission linked" : null}
                  {event.conflictIndicator ? " · Conflict flag" : null}
                  {event.availabilityIndicator ? " · Availability flag" : null}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <footer className="print-confidentiality">
        <p>
          Confidential campaign operations sheet. Do not redistribute outside
          authorized staff. Street addresses, private notes, feed tokens, and
          contacts are excluded by print policy ({projection.profile}).
        </p>
      </footer>
    </article>
  );
}
