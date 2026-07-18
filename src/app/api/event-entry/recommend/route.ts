import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import { fastEntryRecommend } from "@/server/services/operational-intelligence-gateway";

export const dynamic = "force-dynamic";

/** Non-persistent suggestions for draft entry; does not write canonical events. */
export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = fastEntryRecommend({
      calendarType: typeof body.calendarType === "string" ? body.calendarType : undefined,
      eventType: typeof body.eventType === "string" ? body.eventType : undefined,
      countyId: typeof body.countyId === "string" ? body.countyId : undefined,
      city: typeof body.city === "string" ? body.city : undefined,
      candidateAttending: Boolean(body.candidateAttending),
      mediaExpected: Boolean(body.mediaExpected),
      travelRequired: Boolean(body.travelRequired),
    });
    return NextResponse.json(
      { ok: true, recommendation: result, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/event-entry/recommend");
  }
}
