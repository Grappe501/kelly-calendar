import { reconstructCampaignRoutes } from "@/features/google-integration/route-reconstruct";
import { assertGoogleIntegrationAdmin } from "@/features/google-integration/require-google-admin";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/integrations/google/routes/reconstruct",
    async ({ actor, requestId }) => {
      assertGoogleIntegrationAdmin(actor);
      enforceScaffoldRateLimit("/api/integrations/google/routes/reconstruct", requestId);
      const body = (await request.json().catch(() => ({}))) as {
        apply?: boolean;
        confirm?: boolean;
      };
      if (body.apply === true && body.confirm !== true) {
        return { ok: false, message: "Apply requires confirm:true" };
      }
      return reconstructCampaignRoutes({
        apply: body.apply === true && body.confirm === true,
      });
    },
  );
}
