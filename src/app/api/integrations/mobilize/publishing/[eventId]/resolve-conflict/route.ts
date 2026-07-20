import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { resolveMobilizePublicationConflict } from "@/server/services/mobilize-publishing-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/publishing/[eventId]/resolve-conflict",
    async ({ actor }) => resolveMobilizePublicationConflict(actor, eventId, body),
  );
}
