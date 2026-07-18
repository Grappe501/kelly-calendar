import { HISTORICAL_IMPORT_FLOOR } from "@/features/calendar-import/import-limits";
import { defaultImportEndIso } from "@/features/calendar-import/normalize-google-event";
import { runGooglePublicIcalImport } from "@/features/calendar-import/run-import";
import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { requireAuthorized } from "@/server/auth/authorization";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return withAuthenticatedMutation(
    request,
    "/api/import/google-calendar/stage",
    async ({ actor, requestId }) => {
      await requireAuthorized(actor, {
        action: "HISTORICAL_IMPORT_APPROVE",
        resource: { type: "import_record" },
      });
      enforceScaffoldRateLimit("/api/import/google-calendar/stage", requestId);
      const body = (await request.json()) as Record<string, unknown>;
      const result = await runGooglePublicIcalImport({
        sourceUrl: String(body.sourceUrl ?? ""),
        sourceLabel: String(body.sourceLabel ?? "Google Calendar"),
        mode: "stage",
        requestId,
        range: {
          startsAt: String(body.startsAt ?? HISTORICAL_IMPORT_FLOOR),
          endsAt: String(body.endsAt ?? defaultImportEndIso()),
          includeCancelled: Boolean(body.includeCancelled),
          includeAllDay: body.includeAllDay !== false,
          expandRecurring: body.expandRecurring !== false,
          importDescriptions: body.importDescriptions !== false,
          importLocations: body.importLocations !== false,
          importLinks: body.importLinks !== false,
        },
      });
      return {
        ...result,
        operatorReviewRequired: true,
        databaseWriteAttempted: false,
      };
    },
  );
}
