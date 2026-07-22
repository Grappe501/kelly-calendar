import { z } from "zod";
import { withAuthenticatedMutation, withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { ValidationError } from "@/lib/security/safe-error";
import {
  createBulkPreview,
  listRecentBulkOperations,
} from "@/server/services/calendar-bulk-operation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/calendar/bulk",
    async ({ actor }) => listRecentBulkOperations({ actor }),
  );
}

const PreviewSchema = z.object({
  actionType: z.enum([
    "ARCHIVE",
    "RESTORE",
    "CANCEL",
    "ADD_CALENDAR",
    "REMOVE_CALENDAR",
  ]),
  eventIds: z.array(z.string().min(1)).min(1).max(100),
  reason: z.string().max(500).optional().nullable(),
  targetCalendarId: z.string().optional().nullable(),
  clientNonce: z.string().max(120).optional().nullable(),
  querySnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
  seriesScopeRequested: z.boolean().optional(),
});

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/calendar/bulk",
    async ({ actor }) => {
      const body = PreviewSchema.safeParse(await request.json());
      if (!body.success) throw new ValidationError("Invalid bulk preview payload.");
      return createBulkPreview({
        actor,
        actionType: body.data.actionType,
        eventIds: body.data.eventIds,
        reason: body.data.reason,
        targetCalendarId: body.data.targetCalendarId,
        clientNonce: body.data.clientNonce,
        querySnapshot: body.data.querySnapshot,
        seriesScopeRequested: body.data.seriesScopeRequested,
      });
    },
  );
}
