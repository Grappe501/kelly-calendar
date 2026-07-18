import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonAuthRequired } from "@/lib/api/auth-required";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { eventId } = await context.params;
  void eventId;
  return jsonAuthRequired(
    requestId,
    "Event readiness requires Step 4 authentication.",
    "/api/events/[eventId]/readiness",
  );
}
