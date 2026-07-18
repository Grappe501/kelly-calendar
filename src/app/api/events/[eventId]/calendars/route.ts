import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { addEventCalendarMembership } from "@/server/services/event-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/calendars",
    async ({ actor, requestId }) => {
      const body = z
        .object({
          calendarId: z.string().min(1),
          expectedVersion: z.number().int().positive(),
        })
        .safeParse(await request.json());
      if (!body.success) throw new ValidationError("Invalid calendar membership payload.");
      const updated = await addEventCalendarMembership({
        actor,
        eventId,
        calendarId: body.data.calendarId,
        expectedVersion: body.data.expectedVersion,
        requestId,
      });
      return { eventId, version: updated.version };
    },
  );
}
