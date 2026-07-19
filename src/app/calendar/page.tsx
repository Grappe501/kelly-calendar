import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DayView } from "@/components/calendar/DayView";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { MissionDeepLinkBanner } from "@/components/calendar/MissionDeepLinkBanner";
import {
  sanitizeCalendarReturnTo,
} from "@/lib/calendar/mission-deep-link";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
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
 * Calendar Experience Track A — Day, Week, Month.
 * Consumes `?event=` for Open Mission deep links (HL-039 / OW-001).
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const actor = await requireActiveAuthenticatedActor();
  const view =
    params.view === "week" || params.view === "month" ? params.view : "day";

  // Validate returnTo early (no open redirects); not yet rendered as a control.
  void sanitizeCalendarReturnTo(params.returnTo);

  const deepLink = await resolveMissionDeepLink({
    actor,
    rawEventId: params.event,
  });

  // Period continuity: jump to the event's Chicago date when the deep link resolves.
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

  const data = await getCalendarDayViewData(actor, params.date);
  return (
    <>
      {banner}
      <DayView data={data} focusEventId={focusEventId} />
    </>
  );
}
