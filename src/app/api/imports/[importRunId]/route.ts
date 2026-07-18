import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonAuthRequired } from "@/lib/api/auth-required";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ importRunId: string }> };

export async function GET(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { importRunId } = await context.params;
  void importRunId;
  return jsonAuthRequired(
    requestId,
    "Import run detail requires Step 4 authentication.",
    "/api/imports/[importRunId]",
  );
}
