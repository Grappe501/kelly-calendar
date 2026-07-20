import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getDayIncidentBoard } from "@/server/services/mission-incident-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string }> };

export async function GET(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/briefing/[date]/incidents",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Day Incident Board requires campaign leadership access.",
        );
      }
      return getDayIncidentBoard({ dateKey: date, actor });
    },
  );
}
