import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import {
  getEventMissionProjection,
  persistEventMissionProjection,
} from "@/server/services/mission-projection-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

/**
 * GET — Event → Mission projection + optional persisted record + comparison.
 * Does not change Event scheduling.
 */
export async function GET(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/events/[eventId]/mission",
    async ({ actor }) => {
      await requireAuthorized(actor, {
        action: "EVENT_VIEW",
        resource: { type: "event", id: eventId },
      });
      return getEventMissionProjection(eventId);
    },
  );
}

/**
 * POST — Persist projected mission record (idempotent upsert).
 * Operator-owned fields are preserved. Scheduling columns on Event are untouched.
 */
export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/mission",
    async ({ actor }) => {
      await requireAuthorized(actor, {
        action: "EVENT_EDIT",
        resource: { type: "event", id: eventId },
      });
      return persistEventMissionProjection(eventId);
    },
  );
}
