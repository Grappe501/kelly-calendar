import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { archiveEvent } from "@/server/services/event-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/archive",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          expectedVersion: z.number().int().positive(),
          reason: z.string().min(1).max(500),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("expectedVersion and reason are required.");
      const result = await archiveEvent({
        actor,
        eventId,
        expectedVersion: body.data.expectedVersion,
        reason: body.data.reason,
        requestId,
      });
      return result;
    },
  );
}
