import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { findBrief } from "@/server/repositories/communications-composition-repository";
import { PermissionDeniedError, NotFoundError } from "@/lib/security/safe-error";
import { roleHasFullCalendarAccess } from "@/lib/auth/system-roles";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ briefId: string }> };

export async function GET(request: Request, context: Ctx) {
  const { briefId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/communications/briefs/${briefId}`,
    async ({ actor }) => {
      if (!roleHasFullCalendarAccess(actor.primarySystemRole)) {
        throw new PermissionDeniedError("Leadership required");
      }
      const brief = await findBrief(briefId);
      if (!brief) throw new NotFoundError("Brief not found");
      return {
        brief: {
          id: brief.id,
          purpose: brief.purpose,
          channel: brief.channel,
          status: brief.status,
          objective: brief.objective,
          audienceDescription: brief.audienceDescription,
        },
      };
    },
  );
}
