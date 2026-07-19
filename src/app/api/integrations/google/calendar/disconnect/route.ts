import {
  revokeGoogleToken,
} from "@/features/google-integration/google-oauth-client";
import { assertGoogleIntegrationAdmin } from "@/features/google-integration/require-google-admin";
import {
  decryptRefreshToken,
  getActiveConnection,
  markConnectionRevoked,
} from "@/features/google-integration/token-store";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/integrations/google/calendar/disconnect",
    async ({ actor, requestId }) => {
      assertGoogleIntegrationAdmin(actor);
      enforceScaffoldRateLimit("/api/integrations/google/calendar/disconnect", requestId);
      const body = (await request.json().catch(() => ({}))) as { confirm?: boolean };
      if (body.confirm !== true) {
        return {
          ok: false,
          message: "Explicit confirm:true is required to disconnect.",
        };
      }
      const connection = await getActiveConnection();
      if (!connection) {
        return { ok: true, disconnected: false, message: "No active connection." };
      }
      try {
        const refresh = decryptRefreshToken(connection);
        await revokeGoogleToken(refresh);
      } catch {
        // Still destroy local material.
      }
      await markConnectionRevoked(connection.id);
      return {
        ok: true,
        disconnected: true,
        message: "Connection revoked. Imported history was retained.",
      };
    },
  );
}
