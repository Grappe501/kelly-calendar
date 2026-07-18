import { NextResponse } from "next/server";
import { GLOBAL_VISIBILITY_POLICY } from "@/lib/calendar-security/event-visibility-policy";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/system/visibility", requestId);
    return NextResponse.json(
      {
        ok: true,
        policyVersion: GLOBAL_VISIBILITY_POLICY.version,
        defaultAuthenticatedVisibility:
          GLOBAL_VISIBILITY_POLICY.defaultAuthenticatedCampaignVisibility,
        calendarNameVisible: GLOBAL_VISIBILITY_POLICY.showCalendarName,
        safeTitleVisible: GLOBAL_VISIBILITY_POLICY.showSafeEventTitle,
        generalLocationVisible:
          GLOBAL_VISIBILITY_POLICY.showGeneralLocationWhenAvailable,
        protectedDetailsDelivered:
          GLOBAL_VISIBILITY_POLICY.deliverProtectedFieldsToClient,
        authenticationComplete: false,
        liveCalendarDataEnabled: false,
        requestId,
      },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/system/visibility");
  }
}
