import Link from "next/link";
import { CalendarViewSwitcher } from "@/components/calendar/CalendarViewSwitcher";
import type { SecondaryOperatingViewData } from "@/server/services/secondary-operating-view-service";

type Props = {
  data: SecondaryOperatingViewData;
};

export function SecondaryOperatingView({ data }: Props) {
  const title = data.lens.replace(/_/g, " ");

  return (
    <div className="page-stack calendar-secondary-lens">
      <header className="page-header">
        <h1 style={{ textTransform: "capitalize" }}>{title}</h1>
        <p className="executive-question">{data.executiveQuestion}</p>
        <p className="muted">{data.designedOnlyNote}</p>
      </header>

      <CalendarViewSwitcher active="day" dateKey={data.dateKey} />

      <p className="muted">
        <Link href="/">Today</Link>
        {" · "}
        <Link href={`/calendar?view=day&date=${data.dateKey}`}>Day</Link>
        {" · "}
        <Link href="/calendar/ops/travel">Travel</Link>
        {" · "}
        <Link href="/calendar/ops/preparation">Preparation</Link>
        {" · "}
        <Link href="/calendar/ops/follow_up">Follow-up</Link>
        {" · "}
        <Link href="/calendar/ops/conflicts">Conflicts</Link>
        {" · "}
        <Link href="/calendar/ops/people">People</Link>
        {" · "}
        <Link href="/calendar/ops/counties">Counties</Link>
        {" · "}
        <Link href="/calendar/ops/mission">Mission</Link>
      </p>

      {data.items.length === 0 ? (
        <section className="panel">
          <p className="muted">No items in this projection for the loaded Event window.</p>
        </section>
      ) : (
        <ul className="panel">
          {data.items.map((item) => (
            <li key={`${item.eventId}-${item.title}`}>
              <Link href={item.href}>{item.title}</Link>
              <p className="muted">
                {item.startsAt.slice(0, 16).replace("T", " ")} · {item.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
