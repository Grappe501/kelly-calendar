import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { replaceTravel } from "@/server/services/event-plan-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function PUT(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/travel",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          expectedVersion: z.number().int().positive(),
          plan: z.object({
            travelRequired: z.boolean().optional(),
            estimatedDurationMinutes: z.number().optional(),
            notes: z.string().optional(),
          }),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("Invalid travel payload.");
      return replaceTravel({
        actor,
        eventId,
        expectedVersion: body.data.expectedVersion,
        plan: body.data.plan,
        requestId,
      });
    },
  );
}
