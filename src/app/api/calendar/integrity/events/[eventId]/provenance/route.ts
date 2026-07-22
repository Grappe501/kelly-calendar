import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { explainEventProvenance } from "@/server/services/calendar-integrity-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/calendar/integrity/events/[eventId]/provenance",
    async ({ actor }) => explainEventProvenance(actor, eventId),
  );
}
