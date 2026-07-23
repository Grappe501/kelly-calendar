import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";
import { NotFoundError, PermissionDeniedError } from "@/lib/security/safe-error";
import {
  withAuthenticatedMutation,
  withAuthenticatedQuery,
} from "@/server/auth/api-mutation";
import { getCampaignMissionById } from "@/server/repositories/mission-repository";
import {
  applyActivation,
  deactivateActivation,
  getActivationWorkspace,
  previewActivation,
} from "@/server/services/mission-activation-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ missionId: string }> };

async function gate(actor: { primarySystemRole: string }, missionId: string) {
  if (!roleHasFullCalendarAccess(actor.primarySystemRole as never)) {
    throw new PermissionDeniedError("Mission activation requires campaign access.");
  }
  const mission = await getCampaignMissionById(missionId);
  if (!mission) throw new NotFoundError("Mission not found.");
}

export async function GET(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/missions/[missionId]/activation",
    async ({ actor }) => {
      await gate(actor, missionId);
      return getActivationWorkspace(actor, missionId);
    },
  );
}

export async function POST(request: Request, context: Ctx) {
  const { missionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/missions/[missionId]/activation",
    async ({ actor }) => {
      await gate(actor, missionId);
      const body = (await request.json().catch(() => null)) ?? {};
      const action = (body as { action?: string }).action;
      if (action === "preview") {
        return previewActivation(actor, missionId, body as Record<string, unknown>);
      }
      if (action === "deactivate") {
        return deactivateActivation(actor, missionId);
      }
      return applyActivation(actor, missionId, body as Record<string, unknown>);
    },
  );
}
