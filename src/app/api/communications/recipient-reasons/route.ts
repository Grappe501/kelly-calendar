import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listRecipientReasons } from "@/lib/missions/v21/communications/audiences";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/recipient-reasons",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Audience access required");
      }
      return { reasons: listRecipientReasons() };
    },
  );
}
