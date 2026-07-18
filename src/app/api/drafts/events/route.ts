import { NextResponse } from "next/server";
import { listDrafts, saveDraft } from "@/features/event-drafts/draft-store";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/drafts/events", requestId);
    const drafts = listDrafts().map((d) => ({
      draftId: d.draftId,
      status: d.status,
      title: d.basic.campaignDisplayTitle || d.basic.internalTitle,
      primaryCalendar: d.basic.primaryCalendar,
      updatedAt: d.updatedAt,
      liveCalendar: false,
      databaseWriteAttempted: false,
    }));
    return NextResponse.json(
      { ok: true, drafts, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/drafts/events");
  }
}

export async function POST(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/drafts/events", requestId);
    const body = await request.json();
    const draft = saveDraft(body);
    return NextResponse.json(
      {
        ok: true,
        draft,
        banner: "DRAFT — NOT YET ON LIVE CALENDAR",
        databaseWriteAttempted: false,
        requestId,
      },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/drafts/events");
  }
}
