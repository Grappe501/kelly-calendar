import { Suspense } from "react";
import { SchedulingWeekWorkspace } from "@/components/calendar/scheduling/SchedulingWeekWorkspace";
import type { CalendarWeekViewData } from "@/server/services/calendar-week-view-service";
import { eventSheetHref } from "@/lib/calendar/event-sheet-href";

type Props = {
  data: CalendarWeekViewData;
  focusEventId?: string | null;
};

/**
 * CC-08 Week scheduling workspace — multi-column time grid (no drag/resize).
 */
export function WeekView({ data, focusEventId = null }: Props) {
  const byId = new Map<
    string,
    {
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
    }
  >();
  for (const day of data.days) {
    for (const event of day.events) {
      if (byId.has(event.eventId)) continue;
      byId.set(event.eventId, {
        eventId: event.eventId,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        allDay: Boolean(event.allDay),
        status: event.status,
        calendarName: event.primaryCalendar?.name,
        locationLabel: event.location?.label ?? null,
        missionId: null,
        href: eventSheetHref(event.eventId),
      });
    }
  }

  return (
    <Suspense fallback={<div className="muted">Loading week grid…</div>}>
      <SchedulingWeekWorkspace
        dateKey={data.weekStartKey}
        weekDateKeys={data.days.map((d) => d.dateKey)}
        timezone={data.timezone}
        label={data.weekRangeLabel}
        executiveQuestion={data.executiveQuestion}
        events={[...byId.values()]}
        conflicts={data.conflicts}
        focusEventId={focusEventId}
        cataloguePartial={data.cataloguePartial}
      />
    </Suspense>
  );
}
