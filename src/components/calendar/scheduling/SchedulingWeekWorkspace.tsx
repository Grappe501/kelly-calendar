"use client";

import Link from "next/link";
import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  layoutCampaignWeek,
  parseLayoutPreferencesFromRecord,
  type GridEventInput,
} from "@/lib/calendar/scheduling";
import {
  DayTimeGrid,
  SchedulingInspector,
  useSchedulingSelection,
} from "@/components/calendar/scheduling/DayTimeGrid";
import { CalendarViewSwitcher } from "@/components/calendar/CalendarViewSwitcher";
import { CalendarSearchChromeHost } from "@/components/calendar/search/CalendarSearchChromeHost";
import { CalendarDateNav } from "@/components/calendar/CalendarDateNav";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import type { SchedulingDayEvent } from "@/components/calendar/scheduling/SchedulingDayWorkspace";
import { chicagoTodayKey } from "@/lib/calendar/chicago-date";
import {
  BulkSelectionProvider,
  useOptionalBulkSelection,
} from "@/components/calendar/bulk/BulkSelectionProvider";
import { BulkSelectionBar } from "@/components/calendar/bulk/BulkSelectionBar";

type Props = {
  dateKey: string;
  weekDateKeys: string[];
  timezone: string;
  label: string;
  executiveQuestion: string;
  events: SchedulingDayEvent[];
  conflicts: OperationalConflict[];
  focusEventId?: string | null;
  cataloguePartial?: boolean;
};

function conflictMeta(
  eventId: string,
  conflicts: OperationalConflict[],
): { severity: string | null; count: number } {
  const related = conflicts.filter(
    (c) =>
      c.primaryEntity.id === eventId || c.relatedEntity?.id === eventId,
  );
  if (!related.length) return { severity: null, count: 0 };
  const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  let best: string | null = null;
  for (const c of related) {
    if (!best || order.indexOf(c.severity) < order.indexOf(best)) best = c.severity;
  }
  return { severity: best, count: related.length };
}

export function SchedulingWeekWorkspace(props: Props) {
  return (
    <BulkSelectionProvider>
      <SchedulingWeekWorkspaceInner {...props} />
    </BulkSelectionProvider>
  );
}

function SchedulingWeekWorkspaceInner({
  dateKey,
  weekDateKeys,
  timezone,
  label,
  executiveQuestion,
  events,
  conflicts,
  focusEventId = null,
  cataloguePartial = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bulk = useOptionalBulkSelection();
  const prefs = useMemo(() => {
    const raw: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      raw[k] = v;
    });
    return parseLayoutPreferencesFromRecord(raw);
  }, [searchParams]);

  const gridInputs: GridEventInput[] = useMemo(
    () =>
      events.map((e) => {
        const meta = conflictMeta(e.eventId, conflicts);
        return {
          id: e.eventId,
          title: e.title,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          isAllDay: e.allDay,
          status: e.status,
          calendarName: e.calendarName,
          locationLabel: e.locationLabel,
          missionLinked: Boolean(e.missionId),
          isImported: e.isImported,
          isRecurring: e.isRecurring,
          conflictSeverity: meta.severity,
          conflictCount: meta.count,
          href: e.href,
        };
      }),
    [events, conflicts],
  );

  const layout = useMemo(
    () =>
      layoutCampaignWeek({
        weekDateKeys,
        events: gridInputs,
        preferences: prefs,
        timeZone: timezone,
      }),
    [weekDateKeys, gridInputs, prefs, timezone],
  );

  const { selectedEventId, setSelectedEventId } = useSchedulingSelection(focusEventId);
  const todayKey = chicagoTodayKey();

  const onSlotSelect = useCallback(
    (dk: string, hour: number, minute: number) => {
      const start = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      router.push(`/add/quick?date=${encodeURIComponent(dk)}&start=${encodeURIComponent(start)}`);
    },
    [router],
  );

  return (
    <div className="page-stack calendar-week-view sched-workspace">
      <header className="page-header calendar-hero">
        <p className="calendar-kicker">Week schedule</p>
        <h1>{label}</h1>
        <p className="executive-question">{executiveQuestion}</p>
      </header>

      <CalendarViewSwitcher active="week" dateKey={dateKey} />
      <CalendarSearchChromeHost resultCount={events.length} truncated={cataloguePartial} />
      <CalendarDateNav
        dateKey={dateKey}
        view="week"
        label={label}
        isToday={weekDateKeys.includes(todayKey)}
        stepDays={7}
        mode="week"
      />
      <BulkSelectionBar />

      <div className="sched-toolbar">
        <Link className="chip chip-link" href={`/add/quick?date=${dateKey}`}>
          Add Event
        </Link>
        <Link className="chip chip-link" href={`/calendar?view=agenda&date=${dateKey}`}>
          Agenda fallback
        </Link>
        {selectedEventId && bulk ? (
          <button type="button" className="chip" onClick={() => bulk.toggle(selectedEventId)}>
            {bulk.isSelected(selectedEventId) ? "Deselect Event" : "Select for bulk"}
          </button>
        ) : null}
      </div>

      <div className="sched-workspace-body">
        <div className="sched-week-main">
          {layout.allDayRows.length > 0 ? (
            <div
              className="sched-week-allday"
              style={{
                gridTemplateColumns: `repeat(${layout.weekDateKeys.length}, minmax(0, 1fr))`,
              }}
              aria-label="Week all-day spans"
            >
              {layout.allDayRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="sched-allday-chip"
                  style={{
                    gridColumn: `${row.columnStart + 1} / span ${row.columnSpan}`,
                  }}
                  onClick={() => setSelectedEventId(row.id)}
                >
                  {row.title}
                </button>
              ))}
            </div>
          ) : null}

          <div className={`sched-week-columns cols-${layout.weekDateKeys.length}`}>
            {layout.days.map((day) => (
              <div key={day.dateKey} className="sched-week-col">
                <h2 className={day.dateKey === todayKey ? "is-today" : undefined}>
                  <Link href={`/calendar?view=day&date=${day.dateKey}`}>{day.dateKey}</Link>
                  <span className="muted"> · {day.timed.length + day.allDay.length}</span>
                </h2>
                <DayTimeGrid
                  layout={day}
                  preferences={prefs}
                  focusEventId={focusEventId}
                  selectedEventId={selectedEventId}
                  onSelectEvent={setSelectedEventId}
                  onSlotSelect={onSlotSelect}
                  density="compact"
                />
              </div>
            ))}
          </div>
        </div>
        <SchedulingInspector
          eventId={selectedEventId}
          events={events}
          onClose={() => setSelectedEventId(null)}
        />
      </div>
    </div>
  );
}
