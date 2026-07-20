import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { addCarryForwardToCloseout } from "@/server/services/campaign-day-closeout-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string }> };

export async function POST(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/briefing/[date]/closeout/carry-forward",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Campaign Day Closeout requires campaign leadership access.",
        );
      }
      const body = await request.json().catch(() => null);
      return addCarryForwardToCloseout({ dateKey: date, actor, body });
    },
  );
}
