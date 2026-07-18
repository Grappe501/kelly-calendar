import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { replacePacking } from "@/server/services/event-plan-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function PUT(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/packing",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          expectedVersion: z.number().int().positive(),
          items: z.array(
            z.object({
              category: z.string(),
              itemName: z.string(),
              quantity: z.number().optional(),
            }),
          ),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("Invalid packing payload.");
      return replacePacking({
        actor,
        eventId,
        expectedVersion: body.data.expectedVersion,
        items: body.data.items,
        requestId,
      });
    },
  );
}
