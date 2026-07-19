import "server-only";

import { detectCandidateOverlaps } from "@/features/operational-intelligence/services/conflict-service";
import type { OperationalConflict } from "@/features/operational-intelligence/types/conflict-types";
import { getStandingAvailabilityPolicy } from "@/lib/campaign/availability-policy";
import { toMissionCard, type MissionCard } from "@/lib/missions/mission-card";
import { computeMissionTimeline } from "@/lib/missions/mission-timeline";
import {
  buildMissionTodayReadiness,
  buildTodayReadinessSummary,
  type TodayReadinessSummary,
} from "@/lib/missions/today-readiness";
import {
  CAMPAIGN_CALENDAR_TIMEZONE,
  chicagoDateKey,
  chicagoTodayKey,
  resolveCalendarDateKey,
} from "@/lib/calendar/chicago-date";
import { roleMayMutate } from "@/lib/auth/system-roles";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { listEventsForActor } from "@/server/services/event-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

const TIMEZONE = CAMPAIGN_CALENDAR_TIMEZONE;

export type CalendarDayViewData = {
  dateKey: string;
  timezone: string;
  isToday: boolean;
  executiveQuestion: string;
  schedule: SafeEventProjection[];
  missions: MissionCard[];
  readiness: TodayReadinessSummary;
  conflicts: OperationalConflict[];
  standingReminders: string[];
  weatherStatus: "NOT_INTEGRATED";
  viewerDisplayName: string;
};

/**
 * Calendar Experience Day View — presentation adapter only.
 * Owns no facts; consumes listEventsForActor + mission context loaders.
 */
export async function getCalendarDayViewData(
  actor: AuthenticatedActor,
  dateKeyInput?: string | null,
): Promise<CalendarDayViewData> {
  const now = new Date();
  const dateKey = resolveCalendarDateKey(dateKeyInput, now);
  const todayKey = chicagoTodayKey(now);
  const all = (await listEventsForActor(actor)).filter(
    (e): e is SafeEventProjection => e != null,
  );

  const schedule = all
    .filter((e) => chicagoDateKey(e.startsAt) === dateKey)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const context = await loadMissionContextForIds(schedule.map((e) => e.eventId));
  const canMutateDayActions = roleMayMutate(actor.primarySystemRole);

  const missions = schedule.map((event, index) => {
    const travel = context.travel.get(event.eventId);
    const day = context.day.get(event.eventId);
    const timeline = computeMissionTimeline({
      missionId: event.eventId,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      now,
      travelRequired: travel?.travelRequired,
      estimatedDurationMinutes: travel?.estimatedDurationMinutes,
      bufferMinutes: travel?.bufferMinutes,
      departureAt: travel?.departureAt,
      targetArrivalAt: travel?.targetArrivalAt,
    });

    return toMissionCard({
      event,
      timezone: TIMEZONE,
      readiness: context.readiness.get(event.eventId) ?? null,
      timeline,
      isNext: dateKey === todayKey && index === 0,
      now,
      eventVersion: day?.version,
      arrivalAt: day?.arrivalAt ?? null,
      confirmationStatus: day?.confirmationStatus ?? null,
      canMutateDayActions: dateKey === todayKey ? canMutateDayActions : false,
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

  const standingReminders = getStandingAvailabilityPolicy().rules.map((r) => r.summary);

  return {
    dateKey,
    timezone: TIMEZONE,
    isToday: dateKey === todayKey,
    executiveQuestion: "What am I doing today?",
    schedule,
    missions,
    readiness,
    conflicts,
    standingReminders,
    weatherStatus: "NOT_INTEGRATED",
    viewerDisplayName: actor.displayName,
  };
}
