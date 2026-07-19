import Link from "next/link";
import { shiftChicagoDateKey } from "@/lib/calendar/chicago-date";

type Props = {
  dateKey: string;
  view?: string;
  label: string;
  isToday: boolean;
  /** Day = 1, Week = 7 */
  stepDays?: number;
};

export function CalendarDateNav({
  dateKey,
  view = "day",
  label,
  isToday,
  stepDays = 1,
}: Props) {
  const prev = shiftChicagoDateKey(dateKey, -stepDays);
  const next = shiftChicagoDateKey(dateKey, stepDays);

  return (
    <div className="calendar-date-nav">
      <Link className="button button-secondary" href={`/calendar?view=${view}&date=${prev}`}>
        Previous
      </Link>
      <div className="calendar-date-nav-center">
        <p className="calendar-date-label">{label}</p>
        {isToday ? <p className="muted">{stepDays === 7 ? "This week" : "Today"}</p> : null}
        {!isToday ? (
          <Link className="text-link" href={`/calendar?view=${view}`}>
            Jump to {stepDays === 7 ? "this week" : "today"}
          </Link>
        ) : null}
      </div>
      <Link className="button button-secondary" href={`/calendar?view=${view}&date=${next}`}>
        Next
      </Link>
    </div>
  );
}
