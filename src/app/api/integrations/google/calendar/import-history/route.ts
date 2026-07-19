import { runGoogleCalendarImport } from "@/features/google-integration/import-history";
import { assertGoogleIntegrationAdmin } from "@/features/google-integration/require-google-admin";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/integrations/google/calendar/import-history",
    async ({ actor, requestId }) => {
      assertGoogleIntegrationAdmin(actor);
      enforceScaffoldRateLimit("/api/integrations/google/calendar/import-history", requestId);
      const body = (await request.json().catch(() => ({}))) as {
        apply?: boolean;
        from?: string;
        to?: string;
        confirm?: boolean;
      };
      if (body.apply === true && body.confirm !== true) {
        return {
          ok: false,
          message: "Apply requires confirm:true",
        };
      }
      const report = await runGoogleCalendarImport({
        mode: "history",
        apply: body.apply === true && body.confirm === true,
        fromIso: body.from,
        toIso: body.to,
      });
      return report;
    },
  );
}
