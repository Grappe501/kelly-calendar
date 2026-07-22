import Link from "next/link";
import { CalendarViewSwitcher } from "@/components/calendar/CalendarViewSwitcher";
import type { TodayOperatingViewData } from "@/server/services/today-operating-view-service";

type Props = {
  data: TodayOperatingViewData;
};

function PrepList({
  heading,
  items,
}: {
  heading: string;
  items: { id: string; label: string; done: boolean }[];
}) {
  if (items.length === 0) {
    return (
      <div className="today-op-block">
        <h3>{heading}</h3>
        <p className="muted">None listed</p>
      </div>
    );
  }
  return (
    <div className="today-op-block">
      <h3>{heading}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span aria-hidden="true">{item.done ? "✓" : "○"}</span> {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Flagship Today operator surface — answers “What do I need to do today?”
 */
export function TodayOperatingView({ data }: Props) {
  return (
    <div className="page-stack today-operating-view">
      <header className="page-header calendar-hero">
        <p className="calendar-kicker">Operating day</p>
        <h1>Today</h1>
        <p className="executive-question">{data.executiveQuestion}</p>
      </header>

      <CalendarViewSwitcher active="today" dateKey={data.dateKey} />

      <div className="today-quick-links">
        <Link className="button" href="/upload">
          Upload / add
        </Link>
        <Link className="button secondary" href={`/calendar?view=day&date=${data.dateKey}`}>
          Day view
        </Link>
        <Link className="button secondary" href={`/calendar?view=week&date=${data.dateKey}`}>
          Week
        </Link>
      </div>

      {data.cataloguePartial ? (
        <p className="muted">Schedule load may be partial — treat gaps as Unknown.</p>
      ) : null}

      {data.emptyHint ? (
        <section className="panel">
          <p>{data.emptyHint}</p>
          <Link className="button" href={`/calendar?view=day&date=${data.dateKey}`}>
            Open Day view
          </Link>
        </section>
      ) : null}

      {data.cards.map((card) => (
        <article key={card.eventId} className="panel today-op-card">
          <header className="today-op-card-header">
            <p className="today-op-time">
              <time dateTime={card.startsAt}>{card.timeLabel}</time>
            </p>
            <h2>
              <Link href={`/events/${card.eventId}`}>{card.title}</Link>
            </h2>
            {card.locationLabel ? (
              <p className="muted">{card.locationLabel}</p>
            ) : null}
          </header>

          <PrepList heading="Preparation" items={card.preparation} />

          <div className="today-op-block">
            <h3>Travel</h3>
            <p>{card.travelLeaveLabel ?? "No travel attached"}</p>
          </div>

          <div className="today-op-block">
            <h3>People</h3>
            {card.people.length === 0 ? (
              <p className="muted">None listed</p>
            ) : (
              <p>{card.people.join(" · ")}</p>
            )}
          </div>

          <PrepList heading="After" items={card.after} />
        </article>
      ))}

      {data.conflicts.length > 0 ? (
        <section className="panel" aria-labelledby="today-conflicts-heading">
          <h2 id="today-conflicts-heading">Conflicts</h2>
          <ul>
            {data.conflicts.map((c) => (
              <li key={c.id}>
                <strong>{c.severity}</strong> — {c.explanation}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
