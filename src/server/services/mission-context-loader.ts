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

export type MissionDaySnapshotRow = {
  version: number;
  status: string;
  arrivalAt: string | null;
  confirmationStatus: string | null;
};

export type MissionGeoSnapshot = {
  countyId: string | null;
  countyName: string | null;
  city: string | null;
  staffAssignedCount: number;
  staffRequiredCount: number;
  /** True when a VOLUNTEER_LEAD role has an assigned user. */
  volunteerLeadAssigned: boolean;
};

export type MissionContextBundle = {
  readiness: Map<string, EventReadinessResult>;
  travel: Map<string, MissionTravelSnapshot>;
  day: Map<string, MissionDaySnapshotRow>;
  geo: Map<string, MissionGeoSnapshot>;
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
  const day = new Map<string, MissionDaySnapshotRow>();
  const geo = new Map<string, MissionGeoSnapshot>();
  const ids = [...new Set(eventIds)].slice(0, 12);
  if (ids.length === 0) return { readiness, travel, day, geo };

  const rows = await prisma.event.findMany({
    where: { id: { in: ids }, archivedAt: null },
    include: {
      objectives: true,
      programFlowItems: true,
      packingItems: true,
      staffAssignments: true,
      communicationsItems: true,
      travelPlans: true,
      county: true,
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
    day.set(event.id, {
      version: event.version,
      status: event.status,
      arrivalAt: event.arrivalAt?.toISOString() ?? null,
      confirmationStatus: event.confirmationStatus,
    });
    geo.set(event.id, {
      countyId: event.countyId,
      countyName: event.county?.name ?? null,
      city: event.city,
      staffAssignedCount: event.staffAssignments.filter((s) => s.assignedUserId)
        .length,
      staffRequiredCount: event.staffAssignments.length,
      volunteerLeadAssigned: event.staffAssignments.some(
        (s) => s.roleType === "VOLUNTEER_LEAD" && Boolean(s.assignedUserId),
      ),
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

  return { readiness, travel, day, geo };
}

/** @deprecated use loadMissionContextForIds */
export async function loadReadinessForMissionIds(eventIds: string[]) {
  const bundle = await loadMissionContextForIds(eventIds);
  return bundle.readiness;
}
