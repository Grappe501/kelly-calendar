import "server-only";

import { detectCandidateOverlaps } from "@/features/operational-intelligence/services/conflict-service";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import {
  CAMPAIGN_CALENDAR_TIMEZONE,
  chicagoTodayKey,
} from "@/lib/calendar/chicago-date";
import { OPERATING_VIEW_QUESTIONS } from "@/lib/calendar/operating-view-lenses";
import { roleMayMutate } from "@/lib/auth/system-roles";
import { toMissionCard, type MissionCard } from "@/lib/missions/mission-card";
import { computeMissionTimeline } from "@/lib/missions/mission-timeline";
import {
  buildMissionTodayReadiness,
  buildTodayReadinessSummary,
  type TodayReadinessSummary,
} from "@/lib/missions/today-readiness";
import type { AuthenticatedActor } from "@/server/auth/actor";
import type { OperatingEventRecord } from "@/server/services/event-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";
import {
  eventsOnChicagoDate,
  loadEventGraphForChicagoDay,
} from "@/server/services/operating-views/load-event-graph";

export type CalendarDayViewData = {
  dateKey: string;
  timezone: string;
  isToday: boolean;
  executiveQuestion: string;
  schedule: OperatingEventRecord[];
  missions: MissionCard[];
  readiness: TodayReadinessSummary;
  conflicts: OperationalConflict[];
  standingReminders: string[];
  weatherStatus: "NOT_INTEGRATED";
  viewerDisplayName: string;
  cataloguePartial: boolean;
};

/**
 * Day lens — full-day flow from the canonical Event graph.
 */
export async function getCalendarDayViewData(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
): Promise<CalendarDayViewData> {
  const now = new Date();
  const graph = await loadEventGraphForChicagoDay(actor, dateKeyInput);
  const schedule = eventsOnChicagoDate(graph.events, graph.dateKey);
  const context = await loadMissionContextForIds(schedule.map((e) => e.eventId));
  const canMutateDayActions = roleMayMutate(actor.primarySystemRole);
  const todayKey = chicagoTodayKey(now);

  const missions = schedule.map((event, index) => {
    const travel = context.travel.get(event.eventId) ?? event.travel;
    const day = context.day.get(event.eventId);
    const timeline = computeMissionTimeline({
      missionId: event.eventId,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      now,
      travelRequired: travel?.travelRequired,
      estimatedDurationMinutes: travel?.estimatedDurationMinutes ?? undefined,
      bufferMinutes: travel?.bufferMinutes ?? undefined,
      departureAt: travel?.departureAt ?? undefined,
      targetArrivalAt: travel?.targetArrivalAt ?? undefined,
    });

    return toMissionCard({
      event,
      timezone: CAMPAIGN_CALENDAR_TIMEZONE,
      readiness: context.readiness.get(event.eventId) ?? null,
      timeline,
      isNext: graph.dateKey === todayKey && index === 0,
      now,
      eventVersion: day?.version,
      arrivalAt: day?.arrivalAt ?? null,
      confirmationStatus: day?.confirmationStatus ?? null,
      canMutateDayActions:
        graph.dateKey === todayKey ? canMutateDayActions : false,
    });
  });

  const readiness = buildTodayReadinessSummary(
    schedule.map((event) =>
      buildMissionTodayReadiness({
        missionId: event.eventId,
        missionTitle: event.title,
        readiness: context.readiness.get(event.eventId) ?? null,
      }),
    ),
  );

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
    isToday: graph.isToday,
    executiveQuestion: OPERATING_VIEW_QUESTIONS.day,
    schedule,
    missions,
    readiness,
    conflicts,
    // Office hours are background busy blocks — do not list the work schedule on the day lens.
    standingReminders: [],
    weatherStatus: "NOT_INTEGRATED",
    viewerDisplayName: actor.displayName,
    cataloguePartial: graph.cataloguePartial,
  };
}
