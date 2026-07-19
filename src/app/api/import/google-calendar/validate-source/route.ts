import {
  privateIcalConfigStatus,
  requirePrivateGoogleIcalUrl,
} from "@/features/calendar-import/private-ical-env";
import {
  validatePrivateGoogleIcalSource,
  validatePublicGoogleIcalSource,
} from "@/features/calendar-import/source-validation";
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
          pushSupported: false,
          message:
            "Google Calendar API OAuth is prepared for a later step; not active for live mutate. Push requires OAuth write scopes.",
        };
      }

      if (body.sourceType === "PRIVATE_ICAL_ENV") {
        const status = privateIcalConfigStatus();
        if (!status.calendarFeedConfigured) {
          return {
            sourceType: "PRIVATE_ICAL_ENV" as const,
            sourceConfigured: false,
            calendarFeedConfigured: false,
            pushSupported: false,
            syncDirection: "IMPORT_ONLY" as const,
            envKey: status.envKey,
            message: "KCCC Google Calendar iCal URL is not configured.",
          };
        }
        const validated = validatePrivateGoogleIcalSource(requirePrivateGoogleIcalUrl());
        return {
          sourceType: "PRIVATE_ICAL_ENV" as const,
          sourceConfigured: true,
          calendarFeedConfigured: true,
          pushSupported: false,
          syncDirection: "IMPORT_ONLY" as const,
          envKey: status.envKey,
          identifier: validated.redactedLabel,
          sourceFingerprint: validated.sourceFingerprint,
          hostname: validated.hostname,
          message:
            "Private iCal feed is configured via server environment (read-only). Push is not supported over iCal.",
        };
      }

      const validated = validatePublicGoogleIcalSource(String(body.sourceUrl ?? ""));
      return {
        sourceConfigured: true,
        calendarFeedConfigured: true,
        sourceType: "PUBLIC_ICAL" as const,
        identifier: validated.redactedLabel,
        sourceFingerprint: validated.sourceFingerprint,
        hostname: validated.hostname,
        pushSupported: false,
        syncDirection: "IMPORT_ONLY" as const,
      };
    },
  );
}
