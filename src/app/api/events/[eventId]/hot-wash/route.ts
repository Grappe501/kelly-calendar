import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { NotFoundError, PermissionDeniedError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import {
  addHotWashEntry,
  archiveHotWash,
  getEventOutcomeWorkspace,
} from "@/server/services/event-outcome-service";
import { getEventById } from "@/server/repositories/event-repository";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ eventId: string }> };

async function authorize(actor: Parameters<typeof requireAuthorized>[0], eventId: string, mutate: boolean) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError("Hot wash requires campaign calendar access.");
  }
  const event = await getEventById(eventId);
  if (!event) throw new NotFoundError("Event not found.");
  await requireAuthorized(actor, {
    action: mutate ? "EVENT_EDIT" : "EVENT_VIEW",
    resource: { type: "event", id: eventId },
  });
}

export async function GET(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/events/[eventId]/hot-wash",
    async ({ actor }) => {
      await authorize(actor, eventId, false);
      return getEventOutcomeWorkspace(actor, eventId);
    },
  );
}

export async function POST(request: Request, context: Ctx) {
  const { eventId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/events/[eventId]/hot-wash",
    async ({ actor }) => {
      await authorize(actor, eventId, true);
      const body = (await request.json().catch(() => null)) ?? {};
      if ((body as { action?: string }).action === "archive") {
        const entryId = (body as { entryId?: string }).entryId;
        if (!entryId) throw new NotFoundError("entryId required to archive.");
        return archiveHotWash(actor, eventId, entryId);
      }
      return addHotWashEntry(actor, eventId, body as Record<string, unknown>);
    },
  );
}
