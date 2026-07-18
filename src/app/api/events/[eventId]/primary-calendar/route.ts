import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { changePrimaryCalendar } from "@/server/services/event-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/primary-calendar",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          newPrimaryCalendarId: z.string().min(1),
          expectedVersion: z.number().int().positive(),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("Invalid primary calendar change.");
      const event = await changePrimaryCalendar({
        actor,
        eventId,
        newPrimaryCalendarId: body.data.newPrimaryCalendarId,
        expectedVersion: body.data.expectedVersion,
        requestId,
      });
      return { event };
    },
  );
}
