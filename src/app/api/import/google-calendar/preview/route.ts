import { NextResponse } from "next/server";
import { HISTORICAL_IMPORT_FLOOR } from "@/features/calendar-import/import-limits";
import { defaultImportEndIso } from "@/features/calendar-import/normalize-google-event";
import { runGooglePublicIcalImport } from "@/features/calendar-import/run-import";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/import/google-calendar/preview", requestId);
    const body = (await request.json()) as Record<string, unknown>;
    const result = await runGooglePublicIcalImport({
      sourceUrl: String(body.sourceUrl ?? ""),
      sourceLabel: String(body.sourceLabel ?? "Google Calendar"),
      mode: "preview",
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
    return NextResponse.json(
      { ok: true, ...result, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/import/google-calendar/preview");
  }
}
