import { getServerEnvironment } from "@/lib/env/server-environment";
import { mutationsAuthorized } from "@/server/authorization/mutation-gate";
import { getSessionViewer } from "@/server/auth/session";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";
import { AppError } from "@/lib/security/safe-error";
import { roleMayMutate } from "@/lib/auth/system-roles";

/**
 * Mutation routes that are not yet fully wired still require auth + mutator role.
 * Returns 401/403 when unauthorized; 501 when authorized but handler unfinished.
 */
export async function blockUnauthorizedMutation(
  request: Request,
  path: string,
  publicMessage: string,
) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    getServerEnvironment();
    if (!mutationsAuthorized()) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage,
      });
    }
    const viewer = await getSessionViewer();
    if (!viewer) {
      throw new AppError({
        code: "AUTHENTICATION_REQUIRED",
        status: 401,
        publicMessage: "Sign in required.",
      });
    }
    if (!roleMayMutate(viewer.systemRole)) {
      throw new AppError({
        code: "PERMISSION_DENIED",
        status: 403,
        publicMessage: "Your role cannot mutate calendar data.",
      });
    }
    throw new AppError({
      code: "NOT_IMPLEMENTED",
      status: 501,
      publicMessage:
        "Authenticated — this mutation handler is not fully wired yet (later step).",
      internalMessage: `Stub mutation path: ${path}`,
    });
  } catch (error) {
    return jsonSafeError(error, requestId, path);
  }
}
