import "server-only";

import { calculateEventReadiness } from "@/features/operational-intelligence/services/readiness-service";
import type { EventReadinessResult } from "@/features/operational-intelligence/types/readiness-types";
import { prisma } from "@/server/db/prisma";

/**
 * Load OI readiness for a short list of mission ids (Today shell).
 * Uses the same calculation contract as /api/events/[eventId]/readiness.
 */
export async function loadReadinessForMissionIds(
  eventIds: string[],
): Promise<Map<string, EventReadinessResult>> {
  const out = new Map<string, EventReadinessResult>();
  const ids = [...new Set(eventIds)].slice(0, 12);
  if (ids.length === 0) return out;

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
    const readiness = calculateEventReadiness({
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
        packingPackedCount: event.packingItems.filter((p) => Boolean(p.packedAt)).length,
        staffAssignedCount: event.staffAssignments.filter((s) => s.assignedUserId).length,
        staffRequiredCount: event.staffAssignments.length,
        travelRequired: event.travelPlans[0]?.travelRequired ?? false,
        travelHasDriver: Boolean(event.travelPlans[0]?.driverUserId),
        communicationsRequiredCount: event.communicationsItems.length,
        communicationsReadyCount: event.communicationsItems.filter(
          (c) => c.status === "COMPLETE" || Boolean(c.publishedAt),
        ).length,
        hostContactPresent: Boolean(event.city || event.venueName),
      },
    });
    out.set(event.id, readiness);
  }

  return out;
}
