import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { getConflictsForEvent } from "@/server/services/conflict-engine-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

/**
 * CC-06 — persisted conflict history for one Event plus a read-only live
 * assessment (never persisted by this GET). Used by the Event sheet panel.
 */
export async function GET(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/conflicts",
    async ({ actor }) => getConflictsForEvent({ actor, eventId }),
  );
}
