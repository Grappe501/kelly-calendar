import "server-only";

import { OPERATING_VIEW_QUESTIONS } from "@/lib/calendar/operating-view-lenses";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { OperatingEventRecord } from "@/server/services/event-service";
import { loadEventGraphForAgenda } from "@/server/services/operating-views/load-event-graph";

export type AgendaItem = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  dateKey: string;
  timeLabel: string;
  calendarName: string;
  locationLabel: string | null;
  people: string[];
  searchText: string;
  href: string;
};

export type CalendarAgendaViewData = {
  dateKey: string;
  timezone: string;
  executiveQuestion: string;
  forwardDays: number;
  items: AgendaItem[];
  cataloguePartial: boolean;
  viewerDisplayName: string;
};

function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function toAgendaItem(
  event: OperatingEventRecord,
  timezone: string,
): AgendaItem {
  const dateKey = event.startsAt.slice(0, 10);
  const timeLabel = event.allDay
    ? "All day"
    : formatClock(event.startsAt, timezone);
  const locationLabel = event.location?.label ?? null;
  const searchText = [
    event.title,
    event.primaryCalendar.name,
    locationLabel,
    ...event.people,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    eventId: event.eventId,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    dateKey,
    timeLabel,
    calendarName: event.primaryCalendar.name,
    locationLabel,
    people: event.people,
    searchText,
    href: `/calendar?view=day&date=${dateKey}&event=${event.eventId}`,
  };
}

/**
 * Agenda lens — chronological forward list from the canonical Event graph.
 */
export async function getCalendarAgendaViewData(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
  forwardDays = 90,
): Promise<CalendarAgendaViewData> {
  const graph = await loadEventGraphForAgenda(actor, dateKeyInput, forwardDays);
  const items = graph.events
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .map((e) => toAgendaItem(e, graph.timezone));

  return {
    dateKey: graph.dateKey,
    timezone: graph.timezone,
    executiveQuestion: OPERATING_VIEW_QUESTIONS.agenda,
    forwardDays,
    items,
    cataloguePartial: graph.cataloguePartial,
    viewerDisplayName: actor.displayName,
  };
}
