import { NextResponse } from "next/server";
import { getImportStatusSummary } from "@/features/calendar-import/staging-store";
import { googleCalendarApiProvider } from "@/features/calendar-import/providers/google-calendar-api";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/system/imports", requestId);
    const summary = getImportStatusSummary();
    return NextResponse.json(
      {
        ...summary,
        apiProvider: {
          implemented: googleCalendarApiProvider.implemented,
          oauthRequired: googleCalendarApiProvider.oauthRequired,
          capabilities: googleCalendarApiProvider.describeCapabilities(),
        },
        requestId,
      },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/system/imports");
  }
}
