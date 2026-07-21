import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { d22ProductionDispatchHardBlock } from "@/lib/missions/v21/communications/providers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/communications/recipient-conflicts",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Audience access required");
      }
      return {
        notices: [
          d22ProductionDispatchHardBlock().reason,
          "Duplicate destinations must be resolved before manifest approval.",
        ],
        policy:
          "DISPATCH BLOCKED FOR DUPLICATE DESTINATION — system never auto-picks a person.",
        conflicts: [],
        productionDispatchEnabled: false,
      };
    },
  );
}
