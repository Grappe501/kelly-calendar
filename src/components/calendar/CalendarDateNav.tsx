"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { shiftChicagoDateKey, shiftMonthDateKey } from "@/lib/calendar/chicago-date";

type Props = {
  dateKey: string;
  view?: string;
  label: string;
  isToday: boolean;
  /** Day = 1, Week = 7; ignored when mode is month */
  stepDays?: number;
  mode?: "day" | "week" | "month";
};

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

function hrefFor(
  view: string,
  date: string | null,
  searchParams: URLSearchParams,
): string {
  const params = new URLSearchParams();
  params.set("view", view);
  if (date) params.set("date", date);
  for (const key of PRESERVE_KEYS) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  return `/calendar?${params.toString()}`;
}

export function CalendarDateNav({
  dateKey,
  view = "day",
  label,
  isToday,
  stepDays = 1,
  mode = "day",
}: Props) {
  const searchParams = useSearchParams();
  const prev =
    mode === "month" ? shiftMonthDateKey(dateKey, -1) : shiftChicagoDateKey(dateKey, -stepDays);
  const next =
    mode === "month" ? shiftMonthDateKey(dateKey, 1) : shiftChicagoDateKey(dateKey, stepDays);

  const jumpLabel =
    mode === "month" ? "this month" : mode === "week" || stepDays === 7 ? "this week" : "today";

  return (
    <div className="calendar-date-nav">
      <Link className="button button-secondary" href={hrefFor(view, prev, searchParams)}>
        Previous
      </Link>
      <div className="calendar-date-nav-center">
        <p className="calendar-date-label">{label}</p>
        {isToday ? (
          <p className="muted">
            {mode === "month"
              ? "This month"
              : stepDays === 7 || mode === "week"
                ? "This week"
                : "Today"}
          </p>
        ) : (
          <Link className="text-link" href={hrefFor(view, null, searchParams)}>
            Jump to {jumpLabel}
          </Link>
        )}
      </div>
      <Link className="button button-secondary" href={hrefFor(view, next, searchParams)}>
        Next
      </Link>
    </div>
  );
}
