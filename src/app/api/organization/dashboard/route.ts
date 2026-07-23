import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getRoleAwareDashboard } from "@/server/services/campaign-organization-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/organization/dashboard",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Dashboard requires campaign access.");
      }
      const board = new URL(request.url).searchParams.get("board") ?? "campaign_manager";
      return getRoleAwareDashboard(actor, board);
    },
  );
}
