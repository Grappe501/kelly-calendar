import { NextResponse } from "next/server";
import {
  deleteDraft,
  getDraft,
  saveDraft,
} from "@/features/event-drafts/draft-store";
import { AppError } from "@/lib/security/safe-error";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ draftId: string }> };

export async function GET(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/drafts/events/[draftId]", requestId);
    const { draftId } = await context.params;
    const draft = getDraft(draftId);
    if (!draft) {
      throw new AppError({
        code: "NOT_FOUND",
        status: 404,
        publicMessage: "Draft not found.",
      });
    }
    return NextResponse.json(
      { ok: true, draft, liveCalendar: false, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/drafts/events/[draftId]");
  }
}

export async function PATCH(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/drafts/events/[draftId]", requestId);
    const { draftId } = await context.params;
    const existing = getDraft(draftId);
    if (!existing) {
      throw new AppError({
        code: "NOT_FOUND",
        status: 404,
        publicMessage: "Draft not found.",
      });
    }
    const body = await request.json();
    const draft = saveDraft({ ...existing, ...body, draftId });
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
    return jsonSafeError(error, requestId, "/api/drafts/events/[draftId]");
  }
}

export async function DELETE(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/drafts/events/[draftId]", requestId);
    const { draftId } = await context.params;
    const removed = deleteDraft(draftId);
    if (!removed) {
      throw new AppError({
        code: "NOT_FOUND",
        status: 404,
        publicMessage: "Draft not found.",
      });
    }
    return NextResponse.json(
      { ok: true, deleted: true, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/drafts/events/[draftId]");
  }
}
