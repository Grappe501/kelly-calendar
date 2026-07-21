import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AgendaView } from "@/components/calendar/AgendaView";
import { DayView } from "@/components/calendar/DayView";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { MissionDeepLinkBanner } from "@/components/calendar/MissionDeepLinkBanner";
import {
  sanitizeCalendarReturnTo,
} from "@/lib/calendar/mission-deep-link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCalendarAgendaViewData } from "@/server/services/calendar-agenda-view-service";
import { getCalendarDayViewData } from "@/server/services/calendar-day-view-service";
import { getCalendarMonthViewData } from "@/server/services/calendar-month-view-service";
import { getCalendarWeekViewData } from "@/server/services/calendar-week-view-service";
import { resolveMissionDeepLink } from "@/server/services/mission-deep-link-service";

export const metadata: Metadata = {
  title: "Calendar",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  view?: string;
  date?: string;
  event?: string;
  returnTo?: string;
}>;

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
  const view =
    params.view === "week" ||
    params.view === "month" ||
    params.view === "agenda"
      ? params.view
      : "day";

  void sanitizeCalendarReturnTo(params.returnTo);

  const deepLink = await resolveMissionDeepLink({
    actor,
    rawEventId: params.event,
  });

  if (
    deepLink.eventDateKey &&
    deepLink.focusEventId &&
    deepLink.banner.kind === "focused" &&
    params.date !== deepLink.eventDateKey
  ) {
    const qs = new URLSearchParams({
      view,
      date: deepLink.eventDateKey,
      event: deepLink.focusEventId,
    });
    redirect(`/calendar?${qs.toString()}`);
  }

  const banner = <MissionDeepLinkBanner banner={deepLink.banner} />;
  const focusEventId = deepLink.focusEventId;

  if (view === "month") {
    const data = await getCalendarMonthViewData(actor, params.date);
    return (
      <>
        {banner}
        <MonthView data={data} focusEventId={focusEventId} />
      </>
    );
  }

  if (view === "week") {
    const data = await getCalendarWeekViewData(actor, params.date);
    return (
      <>
        {banner}
        <WeekView data={data} focusEventId={focusEventId} />
      </>
    );
  }

  if (view === "agenda") {
    const data = await getCalendarAgendaViewData(actor, params.date);
    return (
      <>
        {banner}
        <AgendaView data={data} focusEventId={focusEventId} />
      </>
    );
  }

  const data = await getCalendarDayViewData(actor, params.date);
  return (
    <>
      {banner}
      <DayView data={data} focusEventId={focusEventId} />
    </>
  );
}
