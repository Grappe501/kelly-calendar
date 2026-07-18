import { mutationsAuthorized } from "@/server/authorization/mutation-gate";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import { AppError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { eventId } = await context.params;
  void eventId;
  try {
    if (!mutationsAuthorized()) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage:
          "Archive is disabled until authentication and RBAC (Step 4) are complete.",
      });
    }
    throw new AppError({
      code: "INTERNAL_ERROR",
      status: 500,
      publicMessage: "Unexpected mutation path.",
    });
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/events/[eventId]/archive");
  }
}
