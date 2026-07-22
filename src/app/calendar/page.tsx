import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AgendaView } from "@/components/calendar/AgendaView";
import { DayView } from "@/components/calendar/DayView";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { MissionDeepLinkBanner } from "@/components/calendar/MissionDeepLinkBanner";
import { sanitizeCalendarReturnTo } from "@/lib/calendar/mission-deep-link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCalendarAgendaViewData } from "@/server/services/calendar-agenda-view-service";
import { getCalendarDayViewData } from "@/server/services/calendar-day-view-service";
import { getCalendarMonthViewData } from "@/server/services/calendar-month-view-service";
import { getCalendarWeekViewData } from "@/server/services/calendar-week-view-service";
import { resolveMissionDeepLink } from "@/server/services/mission-deep-link-service";
import { searchCalendarEvents } from "@/server/services/calendar-search-service";
import { getSavedViewForActor } from "@/server/services/calendar-saved-view-service";
import { serializeCalendarQuery } from "@/lib/calendar/search";
import {
  shiftChicagoDateKey,
  startOfWeekDateKey,
} from "@/lib/calendar/chicago-date";

export const metadata: Metadata = {
  title: "Calendar",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function hasActiveFilters(params: Record<string, string | string[] | undefined>): boolean {
  const keys = [
    "q",
    "statuses",
    "calendarIds",
    "countyIds",
    "tags",
    "importedOnly",
    "localOnly",
    "missionLinked",
    "allDayOnly",
    "timedOnly",
    "recurringOnly",
    "nonRecurringOnly",
    "conflictActive",
    "includeCancelled",
    "includeArchived",
    "integrityFinding",
    "availabilityClassifications",
    "savedViewId",
  ];
  return keys.some((k) => Boolean(first(params[k])));
}

/**
 * Operating views — Day / Week / Month / Agenda.
 * All lenses read from the canonical Event graph.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const actor = await requireActiveAuthenticatedActor();
  const viewRaw = first(params.view);
  const view =
    viewRaw === "week" || viewRaw === "month" || viewRaw === "agenda"
      ? viewRaw
      : "day";

  void sanitizeCalendarReturnTo(first(params.returnTo));

  const deepLink = await resolveMissionDeepLink({
    actor,
    rawEventId: first(params.event),
  });

  if (
    deepLink.eventDateKey &&
    deepLink.focusEventId &&
    deepLink.banner.kind === "focused" &&
    first(params.date) !== deepLink.eventDateKey
  ) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const val = first(v);
      if (val) qs.set(k, val);
    }
    qs.set("view", view);
    qs.set("date", deepLink.eventDateKey);
    qs.set("event", deepLink.focusEventId);
    redirect(`/calendar?${qs.toString()}`);
  }

  const banner = <MissionDeepLinkBanner banner={deepLink.banner} />;
  const focusEventId = deepLink.focusEventId;
  const date = first(params.date);

  let allowedEventIds: Set<string> | null = null;
  let serverFiltered = false;
  if (hasActiveFilters(params)) {
    const raw: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      const val = first(v);
      if (val) raw[k] = val;
    }
    if (raw.savedViewId) {
      try {
        const { resolvedQuery } = await getSavedViewForActor({
          actor,
          viewId: raw.savedViewId,
        });
        const serialized = serializeCalendarQuery(resolvedQuery);
        for (const [k, v] of new URLSearchParams(serialized)) {
          if (!(k in raw)) raw[k] = v;
        }
      } catch {
        /* ignore missing view — search still runs on URL filters */
      }
    }
    if (!raw.dateFrom && date) {
      if (view === "week") {
        const weekStart = startOfWeekDateKey(date);
        raw.dateFrom = weekStart;
        raw.dateTo = shiftChicagoDateKey(weekStart, 6);
      } else {
        raw.dateFrom = date;
        raw.dateTo = date;
      }
      if (view === "agenda") {
        raw.relativeDateMode = "NEXT_N_DAYS";
      }
    }
    const search = await searchCalendarEvents({ actor, rawQuery: raw });
    allowedEventIds = new Set(search.results.map((r) => r.eventId));
    // Expand to full unique set from total page — also fetch without page clamp for filter ids
    if (search.totalUniqueEvents > search.results.length) {
      const wide = await searchCalendarEvents({
        actor,
        rawQuery: { ...raw, page: "1", pageSize: "100" },
      });
      allowedEventIds = new Set(wide.results.map((r) => r.eventId));
    }
    serverFiltered = true;
  }

  if (view === "month") {
    const data = await getCalendarMonthViewData(actor, date);
    return (
      <>
        {banner}
        <Suspense>
          <MonthView data={data} focusEventId={focusEventId} />
        </Suspense>
      </>
    );
  }

  if (view === "week") {
    const data = await getCalendarWeekViewData(actor, date);
    const filtered = allowedEventIds
      ? {
          ...data,
          days: data.days.map((day) => ({
            ...day,
            events: day.events.filter((e) => allowedEventIds!.has(e.eventId)),
          })),
          cataloguePartial: data.cataloguePartial || serverFiltered,
        }
      : data;
    return (
      <>
        {banner}
        <Suspense>
          <WeekView data={filtered} focusEventId={focusEventId} />
        </Suspense>
      </>
    );
  }

  if (view === "agenda") {
    const data = await getCalendarAgendaViewData(actor, date);
    const filtered = allowedEventIds
      ? {
          ...data,
          items: data.items.filter((item) => allowedEventIds!.has(item.eventId)),
        }
      : data;
    return (
      <>
        {banner}
        <Suspense>
          <AgendaView
            data={filtered}
            focusEventId={focusEventId}
            serverFiltered={serverFiltered}
          />
        </Suspense>
      </>
    );
  }

  const data = await getCalendarDayViewData(actor, date);
  const dayFiltered = allowedEventIds
    ? {
        ...data,
        schedule: data.schedule.filter((e) => allowedEventIds!.has(e.eventId)),
        cataloguePartial: data.cataloguePartial || serverFiltered,
      }
    : data;
  return (
    <>
      {banner}
      <Suspense>
        <DayView data={dayFiltered} focusEventId={focusEventId} />
      </Suspense>
    </>
  );
}
