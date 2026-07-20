import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { patchLaunchAcknowledgement } from "@/server/services/campaign-day-launch-review-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string; acknowledgementId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { date, acknowledgementId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/briefing/[date]/launch/acknowledgements/[acknowledgementId]",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError(
          "Morning Launch Review requires campaign leadership access.",
        );
      }
      const body = await request.json().catch(() => null);
      return {
        model: await patchLaunchAcknowledgement({
          dateKey: date,
          acknowledgementId,
          actor,
          body,
        }),
      };
    },
  );
}
