import type { Metadata } from "next";
import { DayView } from "@/components/calendar/DayView";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCalendarDayViewData } from "@/server/services/calendar-day-view-service";
import { getCalendarMonthViewData } from "@/server/services/calendar-month-view-service";
import { getCalendarWeekViewData } from "@/server/services/calendar-week-view-service";

export const metadata: Metadata = {
  title: "Calendar",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string; date?: string }>;

/**
 * Calendar Experience Track A — Day, Week, Month.
 * Agenda / Timeline / Mission remain sequence placeholders pending Calendar Experience Review.
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

  if (view === "month") {
    const data = await getCalendarMonthViewData(actor, params.date);
    return <MonthView data={data} />;
  }

  if (view === "week") {
    const data = await getCalendarWeekViewData(actor, params.date);
    return <WeekView data={data} />;
  }

  const data = await getCalendarDayViewData(actor, params.date);
  return <DayView data={data} />;
}
