import Link from "next/link";
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

export function CalendarDateNav({
  dateKey,
  view = "day",
  label,
  isToday,
  stepDays = 1,
  mode = "day",
}: Props) {
  const prev =
    mode === "month" ? shiftMonthDateKey(dateKey, -1) : shiftChicagoDateKey(dateKey, -stepDays);
  const next =
    mode === "month" ? shiftMonthDateKey(dateKey, 1) : shiftChicagoDateKey(dateKey, stepDays);

  const jumpLabel =
    mode === "month" ? "this month" : mode === "week" || stepDays === 7 ? "this week" : "today";

  return (
    <div className="calendar-date-nav">
      <Link className="button button-secondary" href={`/calendar?view=${view}&date=${prev}`}>
        Previous
      </Link>
      <div className="calendar-date-nav-center">
        <p className="calendar-date-label">{label}</p>
        {isToday ? (
          <p className="muted">
            {mode === "month" ? "This month" : stepDays === 7 || mode === "week" ? "This week" : "Today"}
          </p>
        ) : null}
        {!isToday ? (
          <Link className="text-link" href={`/calendar?view=${view}`}>
            Jump to {jumpLabel}
          </Link>
        ) : null}
      </div>
      <Link className="button button-secondary" href={`/calendar?view=${view}&date=${next}`}>
        Next
      </Link>
    </div>
  );
}
