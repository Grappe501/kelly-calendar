import { NextResponse } from "next/server";
import { getSecurityCapabilityStatus } from "@/lib/security/security-status";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/system/security", requestId);
    const security = getSecurityCapabilityStatus();
    return NextResponse.json(
      {
        ok: true,
        ...security,
        requestId,
      },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/system/security");
  }
}
