import "server-only";

import { detectCandidateOverlaps } from "@/features/operational-intelligence/services/conflict-service";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import {
  CAMPAIGN_CALENDAR_TIMEZONE,
  chicagoDateKey,
  chicagoTodayKey,
} from "@/lib/calendar/chicago-date";
import { OPERATING_VIEW_QUESTIONS } from "@/lib/calendar/operating-view-lenses";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { OperatingEventRecord } from "@/server/services/event-service";
import {
  eventsOnChicagoDate,
  loadEventGraphForChicagoDay,
} from "@/server/services/operating-views/load-event-graph";

export type TodayPrepItem = {
  id: string;
  label: string;
  done: boolean;
};

export type TodayOperatorCard = {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timeLabel: string;
  locationLabel: string | null;
  preparation: TodayPrepItem[];
  travelLeaveLabel: string | null;
  people: string[];
  after: TodayPrepItem[];
  href: string;
};

export type TodayOperatingViewData = {
  dateKey: string;
  timezone: string;
  isToday: boolean;
  executiveQuestion: string;
  viewerDisplayName: string;
  cards: TodayOperatorCard[];
  conflicts: OperationalConflict[];
  cataloguePartial: boolean;
  emptyHint: string | null;
};

function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function toOperatorCard(
  event: OperatingEventRecord,
  timezone: string,
): TodayOperatorCard {
  const prepActions = event.openActions.filter(
    (a) => a.phase === "PRE_EVENT" || a.phase === "EVENT_DAY",
  );
  const packingPrep = event.packing.map((p) => ({
    id: `pack-${p.name}`,
    label: p.name,
    done: ["PACKED", "LOADED", "DELIVERED", "COMPLETED", "RETURNED"].includes(p.state),
  }));
  const preparation: TodayPrepItem[] = [
    ...prepActions.map((a) => ({
      id: a.id,
      label: a.title,
      done: a.status === "COMPLETE",
    })),
    ...packingPrep,
  ];

  const afterActions = event.openActions.filter(
    (a) => a.phase === "POST_EVENT" || a.phase === "FOLLOWUP",
  );
  const after: TodayPrepItem[] = [
    ...event.openFollowUps.map((f) => ({
      id: f.id,
      label: f.title,
      done: f.status === "COMPLETE",
    })),
    ...afterActions.map((a) => ({
      id: a.id,
      label: a.title,
      done: a.status === "COMPLETE",
    })),
  ];

  const travelLeaveLabel = event.travel?.departureAt
    ? `Leave ${formatClock(event.travel.departureAt, timezone)}`
    : event.travel?.travelRequired
      ? "Travel required — departure not set"
      : null;

  const dateKey = chicagoDateKey(event.startsAt);

  return {
    eventId: event.eventId,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timeLabel: event.allDay
      ? "All day"
      : formatClock(event.startsAt, timezone),
    locationLabel: event.location?.label ?? null,
    preparation,
    travelLeaveLabel,
    people: event.people,
    after,
    href: `/calendar?view=day&date=${dateKey}&event=${event.eventId}`,
  };
}

/**
 * Flagship Today lens — mission-driven operator cards from one Event graph load.
 */
export async function getTodayOperatingViewData(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
): Promise<TodayOperatingViewData> {
  const graph = await loadEventGraphForChicagoDay(actor, dateKeyInput);
  const schedule = eventsOnChicagoDate(graph.events, graph.dateKey);
  const cards = schedule.map((e) => toOperatorCard(e, CAMPAIGN_CALENDAR_TIMEZONE));

  const conflicts = detectCandidateOverlaps(
    schedule.map((e) => ({
      id: e.eventId,
      label: e.title,
      startsAt: new Date(e.startsAt),
      endsAt: new Date(e.endsAt),
      status: e.status,
      candidateAttending: true,
      calendarType: e.primaryCalendar.type,
    })),
  );

  return {
    dateKey: graph.dateKey,
    timezone: CAMPAIGN_CALENDAR_TIMEZONE,
    isToday: graph.dateKey === chicagoTodayKey(),
    executiveQuestion: OPERATING_VIEW_QUESTIONS.today,
    viewerDisplayName: actor.displayName,
    cards,
    conflicts,
    cataloguePartial: graph.cataloguePartial,
    emptyHint:
      schedule.length === 0
        ? "Nothing on today’s permissioned schedule. Open Day view if you expect activity."
        : null,
  };
}
