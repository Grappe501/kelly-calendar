import "server-only";

import { buildTodayCommandSummary } from "@/features/operational-intelligence/services/operational-summary-service";
import type { TodayCommandSummary } from "@/features/operational-intelligence/types/summary-types";
import { toMissionCard, type MissionCard } from "@/lib/missions/mission-card";
import { computeMissionTimeline } from "@/lib/missions/mission-timeline";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { listEventsForActor } from "@/server/services/event-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";
import type { SafeEventProjection } from "@/server/services/event-visibility-service";

const TIMEZONE = "America/Chicago";

function chicagoDateKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function chicagoNowParts() {
  const now = new Date();
  return {
    now,
    todayKey: chicagoDateKey(now),
    tomorrowKey: chicagoDateKey(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
  };
}

export type TodayCommandShellData = {
  summary: TodayCommandSummary;
  nextMission: MissionCard | null;
  missionsToday: MissionCard[];
  nextEvent: SafeEventProjection | null;
  upcomingToday: SafeEventProjection[];
  viewerDisplayName: string;
};

/**
 * Authenticated Today Command summary:
 * safe projections + OI readiness + Mission Timeline Engine (Leave By first).
 */
export async function getTodayCommandShellData(
  actor: AuthenticatedActor,
): Promise<TodayCommandShellData> {
  const { now, todayKey, tomorrowKey } = chicagoNowParts();
  const all = (await listEventsForActor(actor)).filter(
    (e): e is SafeEventProjection => e != null,
  );

  const eventsToday = all.filter((e) => chicagoDateKey(e.startsAt) === todayKey);
  const eventsTomorrowCount = all.filter(
    (e) => chicagoDateKey(e.startsAt) === tomorrowKey,
  ).length;

  const upcomingToday = eventsToday
    .filter((e) => new Date(e.endsAt).getTime() >= now.getTime())
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const nextEvent = upcomingToday[0] ?? null;

  const context = await loadMissionContextForIds(
    upcomingToday.map((e) => e.eventId),
  );

  const missionsToday = upcomingToday.map((event, index) => {
    const travel = context.travel.get(event.eventId);
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
      isNext: index === 0,
      now,
    });
  });
  const nextMission = missionsToday[0] ?? null;

  const readinessList = [...context.readiness.values()];
  const summary = buildTodayCommandSummary({
    date: todayKey,
    timezone: TIMEZONE,
    eventsToday,
    eventsTomorrowCount,
    readiness: readinessList,
    conflicts: [],
    authenticationComplete: true,
    liveDataEnabled: true,
  });

  return {
    summary,
    nextMission,
    missionsToday,
    nextEvent,
    upcomingToday,
    viewerDisplayName: actor.displayName,
  };
}
