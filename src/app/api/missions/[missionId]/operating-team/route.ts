import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { NotFoundError, PermissionDeniedError } from "@/lib/security/safe-error";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import { getMissionOperatingTeam } from "@/server/services/campaign-organization-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/missions/[missionId]/operating-team",
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Operating team requires campaign access.");
      }
      const mission = await getCampaignMissionById(missionId);
      if (!mission) throw new NotFoundError("Mission not found.");
      return getMissionOperatingTeam(actor, missionId);
    },
  );
}
