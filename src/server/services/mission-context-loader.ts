import "server-only";

import { calculateEventReadiness } from "@/features/operational-intelligence/services/readiness-service";
import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";
import type { MissionTimelineInput } from "@/lib/missions/mission-timeline";
import { prisma } from "@/server/db/prisma";

export type MissionTravelSnapshot = Pick<
  MissionTimelineInput,
  | "departureAt"
  | "targetArrivalAt"
  | "travelRequired"
  | "estimatedDurationMinutes"
  | "bufferMinutes"
>;

export type MissionContextBundle = {
  readiness: Map<string, EventReadinessResult>;
  travel: Map<string, MissionTravelSnapshot>;
};

/**
 * Load readiness + travel plan snapshots for Today missions.
 * Travel fields are operational planning values only (no route geometry / PII dumps).
 */
export async function loadMissionContextForIds(
  eventIds: string[],
): Promise<MissionContextBundle> {
  const readiness = new Map<string, EventReadinessResult>();
  const travel = new Map<string, MissionTravelSnapshot>();
  const ids = [...new Set(eventIds)].slice(0, 12);
  if (ids.length === 0) return { readiness, travel };

  const rows = await prisma.event.findMany({
    where: { id: { in: ids }, archivedAt: null },
    include: {
      objectives: true,
      programFlowItems: true,
      packingItems: true,
      staffAssignments: true,
      communicationsItems: true,
      travelPlans: true,
    },
  });

  for (const event of rows) {
    const plan = event.travelPlans[0];
    travel.set(event.id, {
      travelRequired: plan?.travelRequired ?? false,
      estimatedDurationMinutes: plan?.estimatedDurationMinutes ?? null,
      bufferMinutes: plan?.bufferMinutes ?? null,
      departureAt: plan?.departureAt?.toISOString() ?? null,
      targetArrivalAt: plan?.targetArrivalAt?.toISOString() ?? null,
    });

    readiness.set(
      event.id,
      calculateEventReadiness({
        event: {
          id: event.id,
          version: event.version,
          eventType: event.eventType,
          internalTitle: event.internalTitle,
          campaignDisplayTitle: event.campaignDisplayTitle,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          city: event.city,
          countyId: event.countyId,
          venueName: event.venueName,
          candidateRole: event.candidateRole,
          defaultVisibility: event.defaultVisibility,
          objectivesCount: event.objectives.length,
          programFlowCount: event.programFlowItems.length,
          packingCount: event.packingItems.length,
          packingPackedCount: event.packingItems.filter((p) => Boolean(p.packedAt))
            .length,
          staffAssignedCount: event.staffAssignments.filter((s) => s.assignedUserId)
            .length,
          staffRequiredCount: event.staffAssignments.length,
          travelRequired: plan?.travelRequired ?? false,
          travelHasDriver: Boolean(plan?.driverUserId),
          communicationsRequiredCount: event.communicationsItems.length,
          communicationsReadyCount: event.communicationsItems.filter(
            (c) => c.status === "COMPLETE" || Boolean(c.publishedAt),
          ).length,
          hostContactPresent: Boolean(event.city || event.venueName),
        },
      }),
    );
  }

  return { readiness, travel };
}

/** @deprecated use loadMissionContextForIds */
export async function loadReadinessForMissionIds(eventIds: string[]) {
  const bundle = await loadMissionContextForIds(eventIds);
  return bundle.readiness;
}
