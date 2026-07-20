import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { findPublicationByEventId } from "@/server/repositories/mobilize-publishing-repository";
import { assertMobilizeIntegrationAdmin } from "@/features/mobilize-integration/require-mobilize-admin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { eventId } = await ctx.params;
  return withAuthenticatedQuery(
    request,
    "/api/integrations/mobilize/publishing/[eventId]/history",
    async ({ actor }) => {
      assertMobilizeIntegrationAdmin(actor);
      const publication = await findPublicationByEventId(eventId);
      return {
        publication,
        approvals: publication?.approvals ?? [],
        attempts: publication?.attempts ?? [],
      };
    },
  );
}
