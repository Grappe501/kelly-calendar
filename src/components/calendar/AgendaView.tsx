"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarViewSwitcher } from "@/components/calendar/CalendarViewSwitcher";
import type { CalendarAgendaViewData } from "@/server/services/calendar-agenda-view-service";

type Props = {
  data: CalendarAgendaViewData;
  focusEventId?: string | null;
};

export function AgendaView({ data, focusEventId = null }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter((item) => item.searchText.includes(q));
  }, [data.items, query]);

  return (
    <div className="page-stack calendar-agenda-view">
      <header className="page-header">
        <h1>Agenda</h1>
        <p className="executive-question">{data.executiveQuestion}</p>
        <p className="muted">
          Chronological · next {data.forwardDays} days · {data.viewerDisplayName}
        </p>
      </header>

      <CalendarViewSwitcher active="agenda" dateKey={data.dateKey} />

      <label className="agenda-search">
        <span className="muted">Search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, place, people…"
          aria-label="Search agenda"
        />
      </label>

      {data.cataloguePartial ? (
        <p className="muted">Agenda load may be partial (loader cap).</p>
      ) : null}

      {filtered.length === 0 ? (
        <section className="panel">
          <p className="muted">No events in this window{query ? " match your search" : ""}.</p>
        </section>
      ) : (
        <ol className="agenda-list">
          {filtered.map((item, index) => {
            const showDate =
              index === 0 || item.dateKey !== filtered[index - 1]?.dateKey;
            return (
              <li
                key={`${item.dateKey}:${item.eventId}`}
                className={
                  focusEventId && item.eventId === focusEventId
                    ? "calendar-event-focused"
                    : undefined
                }
              >
                {showDate ? (
                  <h2 className="agenda-date-heading">{item.dateKey}</h2>
                ) : null}
                <div className="agenda-row">
                  <time dateTime={item.startsAt}>{item.timeLabel}</time>
                  <div>
                    <Link
                      href={item.href}
                      aria-label={
                        item.membershipLabel
                          ? `${item.title}, ${item.membershipLabel}`
                          : item.title
                      }
                    >
                      {item.title}
                    </Link>
                    <p className="muted">
                      {item.calendarName}
                      {item.membershipLabel ? ` · ${item.membershipLabel}` : ""}
                      {item.locationLabel ? ` · ${item.locationLabel}` : ""}
                      {item.people.length > 0 ? ` · ${item.people.join(", ")}` : ""}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
