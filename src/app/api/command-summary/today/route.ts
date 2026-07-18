import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonAuthRequired } from "@/lib/api/auth-required";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  return jsonAuthRequired(
    requestId,
    "Command summary requires Step 4 authentication.",
    "/api/command-summary/today",
  );
}
