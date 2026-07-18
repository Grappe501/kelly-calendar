import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { restoreEvent } from "@/server/services/event-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/restore",
    async ({ actor, requestId }) => {
      const body = z
        .object({ expectedVersion: z.number().int().positive() })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("expectedVersion is required.");
      const event = await restoreEvent({
        actor,
        eventId,
        expectedVersion: body.data.expectedVersion,
        requestId,
      });
      return { event };
    },
  );
}
