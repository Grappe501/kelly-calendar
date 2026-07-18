import { mutationsAuthorized } from "@/server/authorization/mutation-gate";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import { AppError } from "@/lib/security/safe-error";

export async function blockUnauthorizedMutation(
  request: Request,
  path: string,
  publicMessage: string,
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    if (!mutationsAuthorized()) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage,
      });
    }
    throw new AppError({
      code: "INTERNAL_ERROR",
      status: 500,
      publicMessage: "Unexpected mutation path.",
    });
  } catch (error) {
    return jsonSafeError(error, requestId, path);
  }
}
