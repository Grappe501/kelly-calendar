import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { NotFoundError } from "@/lib/security/safe-error";
import {
  campaignMissionFromRow,
  getCampaignMissionById,
} from "@/server/repositories/mission-repository";
import { getEventMissionProjection } from "@/server/services/mission-projection-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/missions/[missionId]",
    async ({ actor }) => {
      const row = await getCampaignMissionById(missionId);
      if (!row) throw new NotFoundError("Mission not found.");
      await requireAuthorized(actor, {
        action: "EVENT_VIEW",
        resource: { type: "event", id: row.sourceEventId },
      });
      const mission = campaignMissionFromRow(row);
      const live = await getEventMissionProjection(row.sourceEventId);
      return {
        mission,
        liveProjection: live.comparison.mission,
        comparison: live.comparison,
        validation: live.validation,
        schedulingUnchanged: true as const,
      };
    },
  );
}
