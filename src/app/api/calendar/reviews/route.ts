import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getOutcomeReviewQueue } from "@/server/services/event-outcome-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/reviews",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Review queue requires campaign calendar access.");
      }
      const url = new URL(request.url);
      const scan = url.searchParams.get("scanEventIds");
      const eventIdsForDueScan = scan
        ? scan.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50)
        : undefined;
      return getOutcomeReviewQueue(actor, {
        includeDueWithoutReview: Boolean(eventIdsForDueScan?.length),
        eventIdsForDueScan,
      });
    },
  );
}
