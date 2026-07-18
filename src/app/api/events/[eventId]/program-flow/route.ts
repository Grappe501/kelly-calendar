import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { replaceProgramFlow } from "@/server/services/event-plan-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function PUT(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/program-flow",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          expectedVersion: z.number().int().positive(),
          items: z.array(
            z.object({
              sequence: z.number().int(),
              activityType: z.string(),
              title: z.string(),
              durationMinutes: z.number().optional(),
            }),
          ),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("Invalid program flow payload.");
      return replaceProgramFlow({
        actor,
        eventId,
        expectedVersion: body.data.expectedVersion,
        items: body.data.items,
        requestId,
      });
    },
  );
}
