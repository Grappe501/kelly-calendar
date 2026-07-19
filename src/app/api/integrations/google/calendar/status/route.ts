import { oauthConfigStatus } from "@/features/google-integration/config";
import { assertGoogleIntegrationAdmin } from "@/features/google-integration/require-google-admin";
import {
  getActiveConnection,
  toSafeConnectionStatus,
} from "@/features/google-integration/token-store";
import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/integrations/google/calendar/status",
    async ({ actor, requestId }) => {
      assertGoogleIntegrationAdmin(actor);
      enforceScaffoldRateLimit("/api/integrations/google/calendar/status", requestId);
      const connection = await getActiveConnection();
      const config = oauthConfigStatus();
      const travelLegCount = await prisma.campaignTravelLeg.count({
        where: { routeTruthType: "GOOGLE_ROUTE_ESTIMATE" },
      });
      return {
        oauth: config,
        connection: toSafeConnectionStatus(connection),
        routes: {
          configured: config.routesApiKeyConfigured,
          enabled: config.routesEnabled,
          estimatedMileageRecords: travelLegCount,
        },
        pushSupported: false,
        syncDirection: "IMPORT_ONLY",
      };
    },
  );
}
