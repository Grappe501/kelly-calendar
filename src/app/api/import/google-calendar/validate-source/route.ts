import { validatePublicGoogleIcalSource } from "@/features/calendar-import/source-validation";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/import/google-calendar/validate-source",
    async ({ actor, requestId }) => {
      await requireAuthorized(actor, {
        action: "HISTORICAL_IMPORT_VIEW",
        resource: { type: "import_record" },
      });
      enforceScaffoldRateLimit(
        "/api/import/google-calendar/validate-source",
        requestId,
      );
      const body = (await request.json()) as {
        sourceUrl?: string;
        sourceType?: string;
      };
      if (body.sourceType === "GOOGLE_API") {
        return {
          sourceType: "GOOGLE_API" as const,
          configured: false,
          oauthRequired: true,
          message:
            "Google Calendar API OAuth is prepared for a later step; not active for live mutate.",
        };
      }
      const validated = validatePublicGoogleIcalSource(String(body.sourceUrl ?? ""));
      return {
        sourceConfigured: true,
        sourceType: "PUBLIC_ICAL" as const,
        identifier: validated.redactedLabel,
        sourceFingerprint: validated.sourceFingerprint,
        hostname: validated.hostname,
      };
    },
  );
}
