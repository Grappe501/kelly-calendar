import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonAuthRequired } from "@/lib/api/auth-required";

/** Shared 401 helper for event-scoped OI GET routes until Step 4. */
export function oiAuthRequired(request: Request, path: string, message?: string) {
  const requestId = getRequestIdFromHeaders(request.headers);
  return jsonAuthRequired(
    requestId,
    message ?? "This operational intelligence endpoint requires Step 4 authentication.",
    path,
  );
}
