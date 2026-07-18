import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { prisma } from "@/server/db/prisma";
import { calculateEventReadiness } from "@/features/operational-intelligence/services/readiness-service";
import { NotFoundError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/events/[eventId]/readiness",
    async ({ actor }) => {
      await requireAuthorized(actor, {
        action: "READINESS_VIEW",
        resource: { type: "event", id: eventId },
      });
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          objectives: true,
          programFlowItems: true,
          packingItems: true,
          staffAssignments: true,
          communicationsItems: true,
          travelPlans: true,
        },
      });
      if (!event) throw new NotFoundError("Event not found.");
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
          staffAssignedCount: event.staffAssignments.filter((s) => s.assignedUserId).length,
          staffRequiredCount: event.staffAssignments.length,
          travelRequired: event.travelPlans[0]?.travelRequired ?? false,
          travelHasDriver: Boolean(event.travelPlans[0]?.driverUserId),
          communicationsRequiredCount: event.communicationsItems.length,
          hostContactPresent: Boolean(event.city || event.venueName),
        },
      });
      return { readiness };
    },
  );
}
