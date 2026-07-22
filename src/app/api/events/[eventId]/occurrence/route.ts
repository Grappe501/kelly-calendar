import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  cancelOccurrence,
  restoreOccurrence,
} from "@/server/services/recurrence-series-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

const bodySchema = z.object({
  expectedVersion: z.number().int().positive(),
  action: z.enum(["cancel", "restore"]),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/occurrence",
    async ({ actor, requestId }) => {
      const parsed = bodySchema.safeParse(await request.json());
      if (!parsed.success) throw new ValidationError("Invalid occurrence action.");
      if (parsed.data.action === "cancel") {
        return cancelOccurrence({
          actor,
          eventId,
          expectedVersion: parsed.data.expectedVersion,
          reason: parsed.data.reason,
          requestId,
        });
      }
      return restoreOccurrence({
        actor,
        eventId,
        expectedVersion: parsed.data.expectedVersion,
        requestId,
      });
    },
  );
}
