import "server-only";
import { getSharedAuthFlags } from "@/lib/auth/auth-flags";

import { detectCandidateOverlaps } from "@/features/operational-intelligence/services/conflict-service";
import {
  buildCampaignBrief,
  type CampaignBrief,
} from "@/lib/missions/campaign-brief";
import { toMissionCard, type MissionCard } from "@/lib/missions/mission-card";
import { computeMissionTimeline } from "@/lib/missions/mission-timeline";
import {
  buildMissionTodayReadiness,
  buildTodayReadinessSummary,
} from "@/lib/missions/today-readiness";
import { roleMayMutate } from "@/lib/auth/system-roles";
import type { AuthenticatedActor } from "@/server/auth/actor";
import { listEventsForActor } from "@/server/services/event-service";
import { loadMissionContextForIds } from "@/server/services/mission-context-loader";

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

export type CampaignBriefPayload = {
  brief: CampaignBrief;
  allMissionsToday: MissionCard[];
  countiesByMission: Array<{ missionId: string; countyName: string | null }>;
  viewerDisplayName: string;
  candidateDataReady: boolean;
};

/**
 * Authenticated Campaign Brief — deterministic aggregation only.
 * Optional AI advisory is applied by the route layer after this returns.
 */
export async function getCampaignBrief(
  actor: AuthenticatedActor,
): Promise<CampaignBriefPayload> {
  const now = new Date();
  const todayKey = chicagoDateKey(now);

  const all = await listEventsForActor(actor);
  const eventsToday = all
    .filter((e) => chicagoDateKey(e.startsAt) === todayKey)
    .sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );

  const context = await loadMissionContextForIds(
    eventsToday.map((e) => e.eventId),
  );
  const canMutateDayActions = roleMayMutate(actor.primarySystemRole);

  const allMissionsToday = eventsToday.map((event) => {
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
      isNext: false,
      now,
      eventVersion: day?.version,
      arrivalAt: day?.arrivalAt ?? null,
      confirmationStatus: day?.confirmationStatus ?? null,
      canMutateDayActions,
    });
  });

  const upcoming = allMissionsToday.filter(
    (m) => new Date(m.endsAt).getTime() >= now.getTime(),
  );
  const nextMission = upcoming[0]
    ? { ...upcoming[0], isNext: true }
    : null;

  const todayReadiness = buildTodayReadinessSummary(
    eventsToday.map((event) =>
      buildMissionTodayReadiness({
        missionId: event.eventId,
        missionTitle: event.title,
        readiness: context.readiness.get(event.eventId) ?? null,
      }),
    ),
  );

  const conflicts = detectCandidateOverlaps(
    eventsToday.map((e) => ({
      id: e.eventId,
      label: e.title,
      startsAt: new Date(e.startsAt),
      endsAt: new Date(e.endsAt),
      status: e.status,
      candidateAttending: true,
      calendarType: e.primaryCalendar.type,
    })),
  );

  const countiesByMission = eventsToday.map((e) => ({
    missionId: e.eventId,
    countyName: context.geo.get(e.eventId)?.countyName ?? null,
  }));

  const brief = buildCampaignBrief({
    date: todayKey,
    timezone: TIMEZONE,
    now,
    allMissionsToday,
    nextMission,
    todayReadiness,
    conflicts,
    countiesByMission,
    staffingByMission: eventsToday.map((e) => {
      const geo = context.geo.get(e.eventId);
      return {
        missionId: e.eventId,
        staffAssignedCount: geo?.staffAssignedCount ?? 0,
        staffRequiredCount: geo?.staffRequiredCount ?? 0,
      };
    }),
  });

  return {
    brief,
    allMissionsToday,
    countiesByMission,
    viewerDisplayName: actor.displayName,
    candidateDataReady: getSharedAuthFlags().candidateDataReady,
  };
}
