import { NextResponse } from "next/server";
import { validatePublicGoogleIcalSource } from "@/features/calendar-import/source-validation";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/import/google-calendar/validate-source", requestId);
    const body = (await request.json()) as { sourceUrl?: string; sourceType?: string };
    if (body.sourceType === "GOOGLE_API") {
      return NextResponse.json(
        {
          ok: true,
          sourceType: "GOOGLE_API",
          configured: false,
          oauthRequired: true,
          message: "Google Calendar API OAuth is prepared for Step 4; not active in Step 3.",
          requestId,
        },
        { headers: { "x-request-id": requestId } },
      );
    }
    const validated = validatePublicGoogleIcalSource(String(body.sourceUrl ?? ""));
    return NextResponse.json(
      {
        ok: true,
        sourceConfigured: true,
        sourceType: "PUBLIC_ICAL",
        identifier: validated.redactedLabel,
        sourceFingerprint: validated.sourceFingerprint,
        hostname: validated.hostname,
        requestId,
      },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/import/google-calendar/validate-source");
  }
}
