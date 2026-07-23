import type { Metadata } from "next";
import Link from "next/link";
import { resolveCalendarDateKey } from "@/lib/calendar/chicago-date";
import {
  isPrintProfile,
  PRINT_PROFILES,
  type PrintProfile,
} from "@/lib/calendar/print";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";

export const metadata: Metadata = {
  title: "Print calendar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const PROFILE_SUMMARY: Record<PrintProfile, string> = {
  DAY_OPERATIONS_REDACTED:
    "Day operations (redacted): title, times, status, city-only location. No street addresses, private notes, feed tokens, or contacts.",
  INTERNAL_DAY_DETAIL:
    "Internal day detail (elevated roles): title, times, status, venue+city, calendar name, mission/conflict indicators. Still excludes street addresses, private notes, and tokens.",
  WEEK_OVERVIEW:
    "Week overview: titles, city, and status only. Suitable for weekly wall sheets.",
};

export default async function CalendarPrintPreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const actor = await requireActiveAuthenticatedActor();
  const params = await searchParams;
  const dateKey = resolveCalendarDateKey(first(params.date));
  const viewRaw = first(params.view) ?? "day";
  const view =
    viewRaw === "week" || viewRaw === "agenda" || viewRaw === "day"
      ? viewRaw
      : "day";
  const profileRaw = first(params.profile);
  const profile: PrintProfile = isPrintProfile(profileRaw)
    ? profileRaw
    : view === "week"
      ? "WEEK_OVERVIEW"
      : "DAY_OPERATIONS_REDACTED";

  const dayHref = `/system/calendar/print/day/${dateKey}?profile=${encodeURIComponent(profile)}`;
  const weekHref = `/system/calendar/print/week/${dateKey}?profile=WEEK_OVERVIEW`;
  const agendaHref = `/system/calendar/print/agenda?dateFrom=${dateKey}&dateTo=${dateKey}&profile=${encodeURIComponent(profile)}`;

  const elevated =
    actor.primarySystemRole === "KELLY" ||
    actor.primarySystemRole === "CAMPAIGN_MANAGER" ||
    actor.primarySystemRole === "SCHEDULER";

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Print calendar</h1>
        <p>
          Choose a date and privacy profile, then open a printable sheet. Print
          URLs carry only date and profile enum — never private event payloads.
        </p>
      </header>

      <section className="panel panel-alert" role="note">
        <h2>Privacy warning</h2>
        <p>
          Printed sheets may leave the building. Prefer{" "}
          <strong>DAY_OPERATIONS_REDACTED</strong> for field packs. Never print
          street addresses, private notes, subscription tokens, or contact lists
          from this surface.
        </p>
      </section>

      <section className="panel">
        <h2>Print options</h2>
        <form className="calendar-filter-drawer" method="get">
          <label className="calendar-filter-field">
            Date
            <input
              type="date"
              name="date"
              defaultValue={dateKey}
              required
            />
          </label>
          <label className="calendar-filter-field">
            View hint
            <select name="view" defaultValue={view}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="agenda">Agenda</option>
            </select>
          </label>
          <label className="calendar-filter-field">
            Privacy profile
            <select name="profile" defaultValue={profile}>
              {PRINT_PROFILES.map((p) => (
                <option
                  key={p}
                  value={p}
                  disabled={p === "INTERNAL_DAY_DETAIL" && !elevated}
                >
                  {p}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="button primary touch-target">
            Update preview links
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Field summary — {profile}</h2>
        <p>{PROFILE_SUMMARY[profile]}</p>
        <p className="muted">
          Selected date <time dateTime={dateKey}>{dateKey}</time> · role{" "}
          {actor.primarySystemRole}
        </p>
        <nav className="view-chips" aria-label="Print sheet links">
          <Link className="chip chip-link touch-target" href={dayHref}>
            Open day sheet
          </Link>
          <Link className="chip chip-link touch-target" href={weekHref}>
            Open week overview
          </Link>
          <Link className="chip chip-link touch-target" href={agendaHref}>
            Open agenda sheet
          </Link>
          <Link className="chip chip-link touch-target" href={`/calendar?date=${dateKey}&view=${view}`}>
            Back to calendar
          </Link>
        </nav>
      </section>
    </div>
  );
}
