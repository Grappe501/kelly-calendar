import { Suspense } from "react";
import { SchedulingDayWorkspace } from "@/components/calendar/scheduling/SchedulingDayWorkspace";
import type { CalendarDayViewData } from "@/server/services/calendar-day-view-service";
import { eventSheetHref } from "@/lib/calendar/event-sheet-href";

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(utc);
}

type Props = {
  data: CalendarDayViewData;
  focusEventId?: string | null;
};

/**
 * CC-08 Day scheduling workspace — time grid (no drag/resize).
 */
export function DayView({ data, focusEventId = null }: Props) {
  const label = formatDayLabel(data.dateKey);
  const events = data.schedule.map((event) => ({
    eventId: event.eventId,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: Boolean(event.allDay),
    status: event.status,
    calendarName: event.primaryCalendar?.name,
    locationLabel: event.location?.label ?? null,
    missionId: event.missionId,
    href: eventSheetHref(event.eventId),
  }));

  return (
    <Suspense fallback={<div className="muted">Loading day grid…</div>}>
      <SchedulingDayWorkspace
        dateKey={data.dateKey}
        timezone={data.timezone}
        isToday={data.isToday}
        label={label}
        executiveQuestion={data.executiveQuestion}
        events={events}
        conflicts={data.conflicts}
        focusEventId={focusEventId}
        cataloguePartial={data.cataloguePartial}
      />
    </Suspense>
  );
}
