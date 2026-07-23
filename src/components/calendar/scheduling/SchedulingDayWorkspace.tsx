"use client";

import Link from "next/link";
import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  layoutCampaignDay,
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
import {
  BulkSelectionProvider,
  useOptionalBulkSelection,
} from "@/components/calendar/bulk/BulkSelectionProvider";
import { BulkSelectionBar } from "@/components/calendar/bulk/BulkSelectionBar";
import { MobileAgendaFallbackLink } from "@/components/calendar/MobileAgendaFallbackLink";

export type SchedulingDayEvent = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  status?: string;
  calendarName?: string;
  locationLabel?: string | null;
  missionId?: string | null;
  href: string;
  isImported?: boolean;
  isRecurring?: boolean;
};

type Props = {
  dateKey: string;
  timezone: string;
  isToday: boolean;
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

export function SchedulingDayWorkspace(props: Props) {
  return (
    <BulkSelectionProvider>
      <SchedulingDayWorkspaceInner {...props} />
    </BulkSelectionProvider>
  );
}

function SchedulingDayWorkspaceInner({
  dateKey,
  timezone,
  isToday,
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
      layoutCampaignDay({
        dateKey,
        events: gridInputs,
        preferences: prefs,
        timeZone: timezone,
      }),
    [dateKey, gridInputs, prefs, timezone],
  );

  const { selectedEventId, setSelectedEventId } = useSchedulingSelection(focusEventId);
  const orderedIds = useMemo(
    () => [...layout.allDay.map((a) => a.id), ...layout.timed.map((t) => t.id)],
    [layout],
  );

  const onSlotSelect = useCallback(
    (dk: string, hour: number, minute: number) => {
      const start = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      router.push(`/add/quick?date=${encodeURIComponent(dk)}&start=${encodeURIComponent(start)}`);
    },
    [router],
  );

  const idx = selectedEventId ? orderedIds.indexOf(selectedEventId) : -1;

  return (
    <div className="page-stack calendar-day-view sched-workspace">
      <header className="page-header calendar-hero">
        <p className="calendar-kicker">{isToday ? "Today’s schedule" : "Day schedule"}</p>
        <h1>{label}</h1>
        <p className="executive-question">{executiveQuestion}</p>
      </header>

      <CalendarViewSwitcher active="day" dateKey={dateKey} />
      <CalendarSearchChromeHost compact resultCount={events.length} truncated={cataloguePartial} />
      <CalendarDateNav dateKey={dateKey} view="day" label={label} isToday={isToday} />
      <BulkSelectionBar />

      <div className="sched-toolbar" aria-label="Day schedule tools">
        <Link className="chip chip-link touch-target" href={`/add/quick?date=${dateKey}`}>
          Add Event
        </Link>
        <MobileAgendaFallbackLink dateKey={dateKey} />
        {selectedEventId && bulk ? (
          <button
            type="button"
            className="chip"
            onClick={() => bulk.toggle(selectedEventId)}
          >
            {bulk.isSelected(selectedEventId) ? "Deselect Event" : "Select for bulk"}
          </button>
        ) : null}
        {isToday ? (
          <button
            type="button"
            className="chip"
            onClick={() => {
              const el = document.querySelector(".sched-now-line");
              el?.scrollIntoView({ block: "center", behavior: "smooth" });
            }}
          >
            Now
          </button>
        ) : null}
      </div>

      <div className="sched-workspace-body">
        <DayTimeGrid
          layout={layout}
          preferences={prefs}
          focusEventId={focusEventId}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
          onSlotSelect={onSlotSelect}
        />
        <SchedulingInspector
          eventId={selectedEventId}
          events={events}
          onClose={() => setSelectedEventId(null)}
          onPrev={
            idx > 0
              ? () => setSelectedEventId(orderedIds[idx - 1] ?? null)
              : undefined
          }
          onNext={
            idx >= 0 && idx < orderedIds.length - 1
              ? () => setSelectedEventId(orderedIds[idx + 1] ?? null)
              : undefined
          }
        />
      </div>

      {conflicts.length > 0 ? (
        <section className="panel panel-alert" aria-label="Conflicts">
          <h2>Active conflicts</h2>
          <ul>
            {conflicts.slice(0, 8).map((c) => (
              <li key={c.id}>
                {c.severity}: {c.explanation}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
