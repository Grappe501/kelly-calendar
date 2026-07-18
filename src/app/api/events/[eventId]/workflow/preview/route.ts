import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { previewEventWorkflow } from "@/server/services/operational-intelligence-gateway";
import { prisma } from "@/server/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/workflow/preview",
    async ({ actor }) => {
      await requireAuthorized(actor, {
        action: "WORKFLOW_PREVIEW",
        resource: { type: "event", id: eventId },
      });
      const body = z
        .object({
          workflowId: z.string(),
          expectedEventVersion: z.number().int().positive().optional(),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("workflowId is required.");
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { primaryCalendar: true },
      });
      if (!event) throw new NotFoundError("Event not found.");
      const preview = previewEventWorkflow({
        eventId,
        eventVersion: event.version,
        workflowId: body.data.workflowId,
        eventType: event.eventType ?? undefined,
        calendarType: event.primaryCalendar.calendarType,
      });
      return { preview, mutates: false };
    },
  );
}
