import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getDayLogisticsBoard } from "@/server/services/mission-logistics-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string }> };

export async function GET(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/briefing/[date]/logistics",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Day Logistics Board requires campaign leadership access.",
        );
      }
      return getDayLogisticsBoard({ dateKey: date, actor });
    },
  );
}
