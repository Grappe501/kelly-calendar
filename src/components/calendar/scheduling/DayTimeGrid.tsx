"use client";

import Link from "next/link";
import { useMemo, useState, useCallback, useEffect } from "react";
import type { DayLayoutResult, TimedLayoutItem, AllDayLayoutItem, LayoutPreferences } from "@/lib/calendar/scheduling";
import { canonicalizeLayoutPreferences } from "@/lib/calendar/scheduling";

type Props = {
  layout: DayLayoutResult;
  preferences?: Partial<LayoutPreferences>;
  focusEventId?: string | null;
  selectedEventId?: string | null;
  onSelectEvent?: (id: string | null) => void;
  onSlotSelect?: (dateKey: string, hour: number, minute: number) => void;
  density?: "compact" | "comfortable";
};

function blockStyle(item: TimedLayoutItem): React.CSSProperties {
  const width = 100 / item.laneCount;
  const left = item.lane * width;
  return {
    top: `${item.topPct}%`,
    height: `${item.heightPct}%`,
    left: `calc(${left}% + 2px)`,
    width: `calc(${width}% - 4px)`,
  };
}

export function DayTimeGrid({
  layout,
  preferences,
  focusEventId = null,
  selectedEventId = null,
  onSelectEvent,
  onSlotSelect,
  density,
}: Props) {
  const prefs = canonicalizeLayoutPreferences({
    ...preferences,
    density: density ?? preferences?.density,
  });
  const pxPerHour = prefs.density === "compact" ? 40 : 56;
  const hours = layout.hourLabels;
  const gridHeight = hours.length * pxPerHour;

  const handleKeySlot = useCallback(
    (hour: number) => {
      onSlotSelect?.(layout.dateKey, hour, 0);
    },
    [layout.dateKey, onSlotSelect],
  );

  return (
    <div className="sched-day-grid" data-density={prefs.density}>
      {prefs.allDayExpanded !== false && layout.allDay.length > 0 ? (
        <div className="sched-allday-lane" aria-label="All-day events">
          {layout.allDay.map((item) => (
            <AllDayChip
              key={item.id}
              item={item}
              selected={selectedEventId === item.id || focusEventId === item.id}
              onSelect={onSelectEvent}
            />
          ))}
        </div>
      ) : null}

      {layout.outsideHoursIds.length > 0 ? (
        <p className="muted sched-outside-note">
          {layout.outsideHoursIds.length} event
          {layout.outsideHoursIds.length === 1 ? "" : "s"} outside visible hours
          ({prefs.visibleStartHour}:00–{prefs.visibleEndHour}:00). Expand hours in
          filters or open Agenda.
        </p>
      ) : null}

      <div className="sched-timed-wrap" style={{ height: gridHeight }}>
        <div className="sched-hours" aria-hidden="true">
          {hours.map((h) => (
            <div key={h} className="sched-hour-label" style={{ height: pxPerHour }}>
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div
          className="sched-canvas"
          role="grid"
          aria-label={`Timed schedule for ${layout.dateKey}`}
          style={{ height: gridHeight }}
        >
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              className="sched-hour-slot"
              style={{ height: pxPerHour, top: (h - hours[0]) * pxPerHour }}
              aria-label={`Create event at ${h}:00 on ${layout.dateKey}`}
              onClick={() => handleKeySlot(h)}
            />
          ))}
          {layout.currentTimeTopPct != null ? (
            <div
              className="sched-now-line"
              style={{ top: `${layout.currentTimeTopPct}%` }}
              aria-hidden="true"
            />
          ) : null}
          {layout.timed
            .filter((item) => !item.outsideVisibleHours)
            .map((item) => (
            <TimedBlock
              key={item.id}
              item={item}
              selected={selectedEventId === item.id || focusEventId === item.id}
              onSelect={onSelectEvent}
              showConflicts={prefs.showConflicts}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AllDayChip({
  item,
  selected,
  onSelect,
}: {
  item: AllDayLayoutItem;
  selected: boolean;
  onSelect?: (id: string | null) => void;
}) {
  return (
    <button
      type="button"
      className={`sched-allday-chip${selected ? " is-selected" : ""}`}
      aria-label={item.ariaLabel}
      onClick={() => onSelect?.(item.id)}
    >
      <span>{item.title}</span>
      <Link href={item.href} className="sched-open-link" onClick={(e) => e.stopPropagation()}>
        Open
      </Link>
    </button>
  );
}

function TimedBlock({
  item,
  selected,
  onSelect,
  showConflicts,
}: {
  item: TimedLayoutItem;
  selected: boolean;
  onSelect?: (id: string | null) => void;
  showConflicts: boolean;
}) {
  return (
    <button
      type="button"
      className={`sched-event-block${selected ? " is-selected" : ""}${
        showConflicts && item.conflictCount ? " has-conflict" : ""
      }`}
      style={blockStyle(item)}
      aria-label={item.ariaLabel}
      onClick={() => onSelect?.(item.id)}
    >
      <span className="sched-event-title">{item.title}</span>
      {item.heightPct > 8 ? (
        <span className="sched-event-meta muted">
          {item.calendarName}
          {item.locationLabel ? ` · ${item.locationLabel}` : ""}
          {item.missionLinked ? " · Mission" : ""}
          {item.isRecurring ? " · Recurring" : ""}
          {showConflicts && item.conflictCount
            ? ` · ${item.conflictCount} conflict`
            : ""}
        </span>
      ) : null}
    </button>
  );
}

export function useSchedulingSelection(initialId: string | null = null) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialId);
  useEffect(() => {
    setSelectedEventId(initialId);
  }, [initialId]);
  return { selectedEventId, setSelectedEventId };
}

export function SchedulingInspector({
  eventId,
  events,
  onClose,
  onPrev,
  onNext,
}: {
  eventId: string | null;
  events: Array<{
    eventId: string;
    title: string;
    startsAt: string;
    endsAt: string;
    href: string;
    status?: string;
    calendarName?: string;
    locationLabel?: string | null;
    missionId?: string | null;
  }>;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const event = useMemo(
    () => events.find((e) => e.eventId === eventId) ?? null,
    [events, eventId],
  );
  useEffect(() => {
    if (!eventId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [eventId, onClose]);

  if (!eventId || !event) return null;
  return (
    <aside className="sched-inspector panel" aria-label="Event inspector">
      <div className="sched-inspector-head">
        <h2>{event.title}</h2>
        <button type="button" className="chip" onClick={onClose} aria-label="Close inspector">
          Close
        </button>
      </div>
      <p className="muted">
        {event.startsAt} – {event.endsAt}
      </p>
      {event.calendarName ? <p>{event.calendarName}</p> : null}
      {event.locationLabel ? <p>{event.locationLabel}</p> : null}
      {event.status ? <p className="muted">Status: {event.status}</p> : null}
      {event.missionId ? <p className="muted">Mission linked</p> : null}
      <p>
        <Link className="button" href={event.href}>
          Open full event sheet
        </Link>
      </p>
      <div className="sched-inspector-nav">
        <button type="button" className="chip" onClick={onPrev} disabled={!onPrev}>
          Previous
        </button>
        <button type="button" className="chip" onClick={onNext} disabled={!onNext}>
          Next
        </button>
      </div>
      <p className="muted">
        Drag-and-drop and resize are not available in CC-08. Use the event sheet to
        edit times intentionally.
      </p>
    </aside>
  );
}
