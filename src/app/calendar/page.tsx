import type { Metadata } from "next";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCalendarDayViewData } from "@/server/services/calendar-day-view-service";
import { getCalendarWeekViewData } from "@/server/services/calendar-week-view-service";

export const metadata: Metadata = {
  title: "Calendar",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string; date?: string }>;

/**
 * Calendar Experience Track A — Day + Week Views.
 * Month / Agenda / Timeline / Mission remain sequence placeholders.
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const actor = await requireActiveAuthenticatedActor();
  const view = params.view === "week" ? "week" : "day";

  if (view === "week") {
    const data = await getCalendarWeekViewData(actor, params.date);
    return <WeekView data={data} />;
  }

  const data = await getCalendarDayViewData(actor, params.date);
  return <DayView data={data} />;
}
