import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { archiveSavedView } from "@/server/services/calendar-saved-view-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ viewId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { viewId } = await ctx.params;
  return withAuthenticatedMutation(
    request,
    `/api/calendar/saved-views/${viewId}/archive`,
    async ({ actor }) => archiveSavedView({ actor, viewId }),
  );
}
