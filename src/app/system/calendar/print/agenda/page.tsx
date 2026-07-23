import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPrintButton } from "@/components/calendar/CalendarPrintButton";
import {
  resolveCalendarDateKey,
  shiftChicagoDateKey,
} from "@/lib/calendar/chicago-date";
import { isPrintProfile, type PrintProfile } from "@/lib/calendar/print";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import {
  getAgendaPrintProjection,
  MAX_PRINT_AGENDA_DAYS,
} from "@/server/services/calendar-print-service";

export const metadata: Metadata = {
  title: "Print agenda",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Ctx = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function CalendarPrintAgendaPage({ searchParams }: Ctx) {
  const actor = await requireActiveAuthenticatedActor();
  const sp = await searchParams;
  const dateFrom = resolveCalendarDateKey(first(sp.dateFrom) ?? first(sp.date));
  const dateTo = resolveCalendarDateKey(
    first(sp.dateTo) ?? shiftChicagoDateKey(dateFrom, 6),
  );
  const profileRaw = first(sp.profile);
  const profile: PrintProfile = isPrintProfile(profileRaw)
    ? profileRaw
    : "DAY_OPERATIONS_REDACTED";

  const projection = await getAgendaPrintProjection({
    actor,
    dateFrom,
    dateTo,
    profile,
  });

  return (
    <article className="calendar-print-sheet page-stack">
      <header className="page-header">
        <p className="calendar-kicker">Kelly Campaign Command Calendar</p>
        <h1>Agenda sheet</h1>
        <p>
          {projection.dateFrom} → {projection.dateTo} · Profile{" "}
          <span className="status-pill">{projection.profile}</span>
          {projection.truncated ? " · truncated" : null}
        </p>
        <p className="muted no-print">
          Agenda print is bounded to {MAX_PRINT_AGENDA_DAYS} inclusive days.
        </p>
        <div className="no-print button-row">
          <CalendarPrintButton />
          <Link
            className="chip chip-link touch-target"
            href={`/system/calendar/print/preview?date=${dateFrom}&view=agenda&profile=${encodeURIComponent(profile)}`}
          >
            Preview options
          </Link>
        </div>
      </header>

      {projection.events.length === 0 ? (
        <p className="muted">No printable events in this range.</p>
      ) : (
        <ol className="print-event-list">
          {projection.events.map((event) => (
            <li key={event.eventId} className="print-event-row">
              <div className="print-event-time">
                {event.isAllDay
                  ? "All day"
                  : formatClock(event.startsAt, event.timezone)}
              </div>
              <div className="print-event-body">
                <h2>{event.title}</h2>
                <p>
                  <span className="status-pill" data-status={event.status}>
                    {event.status}
                  </span>
                  {event.locationLabel ? ` · ${event.locationLabel}` : null}
                </p>
                <p className="muted">#{event.eventNumber}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <footer className="print-confidentiality">
        <p>
          Confidential agenda sheet ({projection.profile}). Street addresses,
          private notes, feed tokens, and contacts are excluded.
        </p>
      </footer>
    </article>
  );
}
