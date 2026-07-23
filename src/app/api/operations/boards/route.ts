import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getOperationsBoard } from "@/server/services/mission-activation-service";

export const dynamic = "force-dynamic";

const BOARDS = new Set([
  "events",
  "communications",
  "volunteers",
  "logistics",
  "field",
  "tasks",
  "notifications",
]);

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/operations/boards",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Operations boards require campaign access.");
      }
      const url = new URL(request.url);
      const board = url.searchParams.get("board") ?? "tasks";
      if (!BOARDS.has(board)) {
        throw new PermissionDeniedError("Unknown board.");
      }
      return getOperationsBoard(actor, board as never);
    },
  );
}
