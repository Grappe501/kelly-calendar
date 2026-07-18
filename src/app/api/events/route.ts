import { NextResponse } from "next/server";
import { mutationsAuthorized } from "@/server/authorization/mutation-gate";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import { AppError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  return NextResponse.json(
    {
      ok: true,
      events: [],
      authenticationComplete: false,
      liveCalendarDataEnabled: false,
      message: "Event list requires Step 4 authentication before live queries are enabled.",
      requestId,
    },
    { headers: { "x-request-id": requestId } },
  );
}

export function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    if (!mutationsAuthorized()) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage:
          "Event creation is disabled until authentication and RBAC (Step 4) are complete.",
      });
    }
    throw new AppError({
      code: "INTERNAL_ERROR",
      status: 500,
      publicMessage: "Unexpected mutation path.",
    });
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/events");
  }
}
