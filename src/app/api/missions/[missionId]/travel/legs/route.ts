import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { PermissionDeniedError, NotFoundError } from "@/lib/security/safe-error";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import {
  reorderMissionTravelLegs,
  upsertMissionTravelLeg,
} from "@/server/services/mission-travel-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string }> };

async function authorize(actor: Parameters<typeof requireAuthorized>[0], missionId: string) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
    throw new PermissionDeniedError(
      "Travel and Movement Operations requires campaign leadership access.",
    );
  }
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");
  await requireAuthorized(actor, {
    action: "EVENT_EDIT",
    resource: { type: "event", id: mission.sourceEventId },
  });
}

export async function POST(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/travel/legs",
    async ({ actor }) => {
      await authorize(actor, missionId);
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object" && Array.isArray((body as { orderedLegIds?: unknown }).orderedLegIds)) {
        return {
          model: await reorderMissionTravelLegs({ missionId, actor, body }),
        };
      }
      return {
        model: await upsertMissionTravelLeg({
          missionId,
          actor,
          body,
        }),
      };
    },
  );
}
