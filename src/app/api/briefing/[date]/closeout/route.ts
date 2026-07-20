import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import type { AuthenticatedActor } from "@/server/auth/actor";
import {
  getCampaignDayCloseout,
  patchCampaignDayCloseout,
} from "@/server/services/campaign-day-closeout-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ date: string }> };

function assertAccess(actor: AuthenticatedActor) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Campaign Day Closeout requires campaign leadership access.",
    );
  }
}

export async function GET(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/briefing/[date]/closeout",
    async ({ actor }) => {
      assertAccess(actor);
      return { model: await getCampaignDayCloseout({ dateKey: date, actor }) };
    },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const { date } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/briefing/[date]/closeout",
    async ({ actor }) => {
      assertAccess(actor);
      const body = await request.json().catch(() => null);
      return {
        model: await patchCampaignDayCloseout({
          dateKey: date,
          actor,
          body,
        }),
      };
    },
  );
}
