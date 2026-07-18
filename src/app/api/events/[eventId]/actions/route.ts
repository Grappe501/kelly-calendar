import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { replaceActions } from "@/server/services/event-plan-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function PUT(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/actions",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          expectedVersion: z.number().int().positive(),
          items: z.array(
            z.object({
              phase: z.string(),
              actionType: z.string(),
              title: z.string(),
              priority: z.string().optional(),
            }),
          ),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("Invalid actions payload.");
      return replaceActions({
        actor,
        eventId,
        expectedVersion: body.data.expectedVersion,
        items: body.data.items,
        requestId,
      });
    },
  );
}
