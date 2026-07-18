import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { applyWorkflowToEvent } from "@/server/services/authenticated-ops-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/workflow/apply",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          workflowId: z.string(),
          workflowVersion: z.number().int().positive(),
          expectedEventVersion: z.number().int().positive(),
          selectedItems: z
            .object({
              objectives: z.boolean().optional(),
              programFlow: z.boolean().optional(),
              packingItems: z.boolean().optional(),
              staffingRoles: z.boolean().optional(),
              actionItems: z.boolean().optional(),
              communicationsItems: z.boolean().optional(),
            })
            .optional(),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("Invalid workflow apply payload.");
      return applyWorkflowToEvent({
        actor,
        eventId,
        ...body.data,
        requestId,
      });
    },
  );
}
