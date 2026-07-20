import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { refreshMobilizeRemoteState } from "@/server/services/mobilize-publishing-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/publishing/[eventId]/refresh",
    async ({ actor }) => refreshMobilizeRemoteState(actor, eventId),
  );
}
