import "server-only";

import { chicagoDateKey } from "@/lib/calendar/chicago-date";
import { OPERATING_VIEW_QUESTIONS } from "@/lib/calendar/operating-view-lenses";
import {
  dayMembershipKind,
  eventIntersectsCampaignDay,
  occupiedCampaignDateKeysForInterval,
  type DayMembershipKind,
} from "@/lib/calendar/temporal";
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
  membershipKind: DayMembershipKind;
  membershipLabel: string;
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

function membershipLabel(kind: DayMembershipKind): string {
  switch (kind) {
    case "all_day":
      return "All day";
    case "continues":
      return "Continues";
    case "ends":
      return "Ends today";
    case "spans":
      return "Spans day";
    case "starts":
    default:
      return "";
  }
}

function toAgendaItemsForOccupiedDays(
  event: OperatingEventRecord,
  timezone: string,
  windowStartKey: string,
  windowEndKey: string,
): AgendaItem[] {
  const occupied = occupiedCampaignDateKeysForInterval(
    event.startsAt,
    event.endsAt,
    Boolean(event.allDay),
  ).filter((key) => key >= windowStartKey && key <= windowEndKey);

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

  return occupied.map((dateKey) => {
    const kind =
      dayMembershipKind({
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        isAllDay: Boolean(event.allDay),
        dateKey,
      }) ?? "starts";
    const baseTime = event.allDay
      ? "All day"
      : kind === "continues" || kind === "ends"
        ? formatClock(event.startsAt, timezone)
        : formatClock(event.startsAt, timezone);
    const label = membershipLabel(kind);
    const timeLabel =
      event.allDay
        ? "All day"
        : kind === "continues"
          ? `Continues · started ${formatClock(event.startsAt, timezone)}`
          : kind === "ends"
            ? `Ends ${formatClock(event.endsAt, timezone)}`
            : baseTime;

    return {
      eventId: event.eventId,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      dateKey,
      timeLabel: label && !event.allDay && kind === "starts" ? baseTime : timeLabel,
      membershipKind: kind,
      membershipLabel: label,
      calendarName: event.primaryCalendar.name,
      locationLabel,
      people: event.people,
      searchText,
      href: `/events/${event.eventId}`,
    };
  });
}

/**
 * Agenda lens — chronological forward list from the canonical Event graph.
 * CC-03: groups by campaign-local occupied day (not UTC date slice).
 */
export async function getCalendarAgendaViewData(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
  forwardDays = 90,
): Promise<CalendarAgendaViewData> {
  const graph = await loadEventGraphForAgenda(actor, dateKeyInput, forwardDays);
  const windowEndKey = (() => {
    const last = new Date(graph.rangeEnd.getTime() - 1);
    return chicagoDateKey(last);
  })();

  const items = graph.events
    .flatMap((e) =>
      toAgendaItemsForOccupiedDays(e, graph.timezone, graph.dateKey, windowEndKey),
    )
    .filter((item) =>
      eventIntersectsCampaignDay({
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        dateKey: item.dateKey,
      }),
    )
    .sort((a, b) => {
      const day = a.dateKey.localeCompare(b.dateKey);
      if (day !== 0) return day;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });

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
