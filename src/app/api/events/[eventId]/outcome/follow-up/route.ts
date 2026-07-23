import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { NotFoundError, PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { createFollowUpFromOutcome } from "@/server/services/event-outcome-service";
import { getEventById } from "@/server/repositories/event-repository";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/outcome/follow-up",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Outcome follow-up requires campaign calendar access.");
      }
      const event = await getEventById(eventId);
      if (!event) throw new NotFoundError("Event not found.");
      await requireAuthorized(actor, {
        action: "EVENT_EDIT",
        resource: { type: "event", id: eventId },
      });
      const body = (await request.json().catch(() => null)) ?? {};
      return createFollowUpFromOutcome(actor, eventId, body as Record<string, unknown>);
    },
  );
}
