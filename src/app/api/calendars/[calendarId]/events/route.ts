import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonAuthRequired } from "@/lib/api/auth-required";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ calendarId: string }> };

export async function GET(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { calendarId } = await context.params;
  void calendarId;
  return jsonAuthRequired(
    requestId,
    "Calendar events require Step 4 authentication.",
    "/api/calendars/[calendarId]/events",
  );
}
