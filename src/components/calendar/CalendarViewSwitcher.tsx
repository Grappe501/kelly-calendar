"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarPrintLink } from "@/components/calendar/CalendarPrintLink";

const VIEWS = [
  { id: "today", label: "Today", path: (dateKey: string) => `/`, dateParam: true },
  { id: "day", label: "Day", path: (dateKey: string) => `/calendar`, view: "day" },
  { id: "week", label: "Week", path: (dateKey: string) => `/calendar`, view: "week" },
  { id: "month", label: "Month", path: (dateKey: string) => `/calendar`, view: "month" },
  { id: "agenda", label: "Agenda", path: (dateKey: string) => `/calendar`, view: "agenda" },
] as const;

export type CalendarViewId = (typeof VIEWS)[number]["id"];

const PRESERVE_KEYS = [
  "q",
  "statuses",
  "calendarIds",
  "countyIds",
  "tags",
  "importedOnly",
  "localOnly",
  "missionLinked",
  "allDayOnly",
  "timedOnly",
  "recurringOnly",
  "nonRecurringOnly",
  "conflictActive",
  "conflictTypes",
  "conflictSeverities",
  "availabilityClassifications",
  "includeCancelled",
  "includeArchived",
  "integrityFinding",
  "savedViewId",
  "relativeDateMode",
  "forwardDays",
  "schemaVersion",
  "layoutVisibleStartHour",
  "layoutVisibleEndHour",
  "layoutDensity",
  "layoutShowWeekends",
  "layoutAllDayExpanded",
  "layoutShowAvailability",
  "layoutShowConflicts",
  "layoutWorkweekOnly",
] as const;

type Props = {
  active: CalendarViewId;
  dateKey: string;
};

export function CalendarViewSwitcher({ active, dateKey }: Props) {
  const searchParams = useSearchParams();
  const printView =
    active === "week" ? "week" : active === "agenda" ? "agenda" : "day";

  return (
    <nav
      className="view-chips calendar-view-switcher"
      role="navigation"
      aria-label="Calendar views"
    >
      <span id="calendar-current-date" className="sr-only" aria-live="polite">
        Current calendar date {dateKey}
      </span>
      {VIEWS.map((view) => {
        const params = new URLSearchParams();
        params.set("date", dateKey);
        if ("view" in view && view.view) params.set("view", view.view);
        for (const key of PRESERVE_KEYS) {
          const value = searchParams.get(key);
          if (value) params.set(key, value);
        }
        const href =
          view.id === "today"
            ? `/?${params.toString()}`
            : `/calendar?${params.toString()}`;
        const isActive = active === view.id;
        return (
          <Link
            key={view.id}
            href={href}
            className={`chip chip-link touch-target${isActive ? " chip-link-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {view.label}
          </Link>
        );
      })}
      <CalendarPrintLink dateKey={dateKey} view={printView} />
    </nav>
  );
}
