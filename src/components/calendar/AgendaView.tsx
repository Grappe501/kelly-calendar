"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarViewSwitcher } from "@/components/calendar/CalendarViewSwitcher";
import { CalendarSearchChromeHost } from "@/components/calendar/search/CalendarSearchChromeHost";
import {
  BulkSelectionProvider,
  useBulkSelection,
} from "@/components/calendar/bulk/BulkSelectionProvider";
import { BulkSelectionBar } from "@/components/calendar/bulk/BulkSelectionBar";
import type { CalendarAgendaViewData } from "@/server/services/calendar-agenda-view-service";

type Props = {
  data: CalendarAgendaViewData;
  focusEventId?: string | null;
  serverFiltered?: boolean;
};

function AgendaBody({
  data,
  focusEventId,
  serverFiltered,
}: Props) {
  const [query, setQuery] = useState("");
  const selection = useBulkSelection();
  const filtered = useMemo(() => {
    if (serverFiltered) return data.items;
    const q = query.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter((item) => item.searchText.includes(q));
  }, [data.items, query, serverFiltered]);

  const uniqueCount = useMemo(
    () => new Set(filtered.map((i) => i.eventId)).size,
    [filtered],
  );

  const visibleIds = useMemo(
    () => [...new Set(filtered.map((i) => i.eventId))],
    [filtered],
  );

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
      <CalendarSearchChromeHost
        resultCount={uniqueCount}
        truncated={Boolean(data.cataloguePartial)}
      />
      <BulkSelectionBar />

      <div className="bulk-select-toolbar">
        <button
          type="button"
          className="chip"
          onClick={() => selection.selectMany(visibleIds)}
        >
          Select visible page ({visibleIds.length})
        </button>
        <button type="button" className="chip" onClick={selection.clear}>
          Clear selection
        </button>
      </div>

      {!serverFiltered ? (
        <label className="agenda-search">
          <span className="muted">Local refine</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, place, people…"
            aria-label="Refine agenda locally"
          />
        </label>
      ) : null}

      {data.cataloguePartial ? (
        <p className="muted">Agenda load may be partial (loader cap).</p>
      ) : null}

      {filtered.length === 0 ? (
        <section className="panel">
          <p className="muted">
            No events in this window
            {query || serverFiltered ? " match your filters" : ""}.
          </p>
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
                  <label className="bulk-check">
                    <input
                      type="checkbox"
                      checked={selection.isSelected(item.eventId)}
                      onChange={() => selection.toggle(item.eventId)}
                      aria-label={`Select ${item.title}`}
                    />
                  </label>
                  <time dateTime={item.startsAt}>{item.timeLabel}</time>
                  <div>
                    <Link
                      href={item.href}
                      aria-label={
                        item.membershipLabel
                          ? `${item.title}, ${item.timeLabel}, ${item.membershipLabel}`
                          : `${item.title}, ${item.timeLabel}`
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

export function AgendaView(props: Props) {
  return (
    <BulkSelectionProvider>
      <AgendaBody {...props} />
    </BulkSelectionProvider>
  );
}
