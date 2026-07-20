import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import {
  getCampaignDayLaunchReview,
  patchCampaignDayLaunchReview,
} from "@/server/services/campaign-day-launch-review-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string }> };

function assertAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Morning Launch Review requires campaign leadership access.",
    );
  }
}

export async function GET(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/briefing/[date]/launch",
    async ({ actor }) => {
      assertAccess(actor);
      return { model: await getCampaignDayLaunchReview({ dateKey: date, actor }) };
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/briefing/[date]/launch",
    async ({ actor }) => {
      assertAccess(actor);
      const body = await request.json().catch(() => null);
      return {
        model: await patchCampaignDayLaunchReview({
          dateKey: date,
          actor,
          body,
        }),
      };
    },
  );
}
