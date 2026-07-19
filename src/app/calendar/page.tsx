import type { Metadata } from "next";
import { DayView } from "@/components/calendar/DayView";
import { requireActiveAuthenticatedActor } from "@/server/auth/actor";
import { getCalendarDayViewData } from "@/server/services/calendar-day-view-service";

export const metadata: Metadata = {
  title: "Calendar",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string; date?: string }>;

/**
 * Calendar Experience Track A — Pass 1 ships Day View.
 * Week / Month / Agenda remain sequence placeholders (no ownership change).
 */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const actor = await requireActiveAuthenticatedActor();
  const data = await getCalendarDayViewData(actor, params.date);
  return <DayView data={data} />;
}
