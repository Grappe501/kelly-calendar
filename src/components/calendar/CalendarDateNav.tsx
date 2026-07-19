import Link from "next/link";
import { shiftChicagoDateKey } from "@/lib/calendar/chicago-date";

type Props = {
  dateKey: string;
  view?: string;
  label: string;
  isToday: boolean;
};

export function CalendarDateNav({ dateKey, view = "day", label, isToday }: Props) {
  const prev = shiftChicagoDateKey(dateKey, -1);
  const next = shiftChicagoDateKey(dateKey, 1);

  return (
    <div className="calendar-date-nav">
      <Link className="button button-secondary" href={`/calendar?view=${view}&date=${prev}`}>
        Previous
      </Link>
      <div className="calendar-date-nav-center">
        <p className="calendar-date-label">{label}</p>
        {isToday ? <p className="muted">Today</p> : null}
        {!isToday ? (
          <Link className="text-link" href={`/calendar?view=${view}`}>
            Jump to today
          </Link>
        ) : null}
      </div>
      <Link className="button button-secondary" href={`/calendar?view=${view}&date=${next}`}>
        Next
      </Link>
    </div>
  );
}
