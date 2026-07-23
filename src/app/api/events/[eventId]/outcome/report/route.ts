import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { NotFoundError, PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { getOutcomeReport } from "@/server/services/event-outcome-service";
import { getEventById } from "@/server/repositories/event-repository";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/events/[eventId]/outcome/report",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Outcome report requires campaign calendar access.");
      }
      const event = await getEventById(eventId);
      if (!event) throw new NotFoundError("Event not found.");
      await requireAuthorized(actor, {
        action: "EVENT_VIEW",
        resource: { type: "event", id: eventId },
      });
      const url = new URL(request.url);
      const includeConfidential =
        url.searchParams.get("includeConfidential") === "1" &&
        (actor.primarySystemRole === "KELLY" ||
          actor.primarySystemRole === "CAMPAIGN_MANAGER");
      return getOutcomeReport(actor, eventId, { includeConfidential });
    },
  );
}
