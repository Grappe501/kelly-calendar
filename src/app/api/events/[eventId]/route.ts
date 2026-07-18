import { NextResponse } from "next/server";
import { mutationsAuthorized } from "@/server/authorization/mutation-gate";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import { AppError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { eventId } = await context.params;
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Event detail requires Step 4 authentication.",
      },
      eventId,
      requestId,
    },
    { status: 401, headers: { "x-request-id": requestId } },
  );
}

export async function PATCH(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { eventId } = await context.params;
  void eventId;
  try {
    if (!mutationsAuthorized()) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage:
          "Event updates are disabled until authentication and RBAC (Step 4) are complete.",
      });
    }
    throw new AppError({
      code: "INTERNAL_ERROR",
      status: 500,
      publicMessage: "Unexpected mutation path.",
    });
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/events/[eventId]");
  }
}

export async function DELETE(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { eventId } = await context.params;
  void eventId;
  try {
    if (!mutationsAuthorized()) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage:
          "Event deletion is disabled until authentication and RBAC (Step 4) are complete.",
      });
    }
    throw new AppError({
      code: "INTERNAL_ERROR",
      status: 500,
      publicMessage: "Unexpected mutation path.",
    });
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/events/[eventId]");
  }
}
