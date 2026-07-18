import { z } from "zod";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { removeEventCalendarMembership } from "@/server/services/event-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string; calendarId: string }> };

export async function DELETE(request: Request, context: Ctx) {
  const { eventId, calendarId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/calendars/[calendarId]",
    async ({ actor, requestId }) => {
      const body = z
        .object({ expectedVersion: z.number().int().positive() })
        .safeParse(await request.json().catch(() => ({})));
      if (!body.success) throw new ValidationError("expectedVersion is required.");
      const updated = await removeEventCalendarMembership({
        actor,
        eventId,
        calendarId,
        expectedVersion: body.data.expectedVersion,
        requestId,
      });
      return { eventId, version: updated.version };
    },
  );
}
