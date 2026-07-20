import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { patchCarryForwardOnCloseout } from "@/server/services/campaign-day-closeout-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string; itemId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { date, itemId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/briefing/[date]/closeout/carry-forward/[itemId]",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Campaign Day Closeout requires campaign leadership access.",
        );
      }
      const body = await request.json().catch(() => null);
      return {
        model: await patchCarryForwardOnCloseout({
          dateKey: date,
          itemId,
          actor,
          body,
        }),
      };
    },
  );
}
