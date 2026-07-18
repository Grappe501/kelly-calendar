import { NextResponse } from "next/server";
import { runConnectionDiagnostic } from "@/lib/db/connection-diagnostic";
import { getCapabilityStatus } from "@/lib/system/capabilities";
import { enforceScaffoldRateLimit } from "@/server/middleware/with-rate-limit";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { jsonSafeError } from "@/server/middleware/with-safe-errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  try {
    enforceScaffoldRateLimit("/api/system/status", requestId);
    const diagnostic = await runConnectionDiagnostic();
    const status = getCapabilityStatus({
      databaseTested: diagnostic.connectionTested,
      databaseSucceeded: diagnostic.connectionSucceeded,
      databaseTargetClass: diagnostic.targetClass,
    });
    return NextResponse.json(
      { ...status, databaseDiagnostic: diagnostic },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return jsonSafeError(error, requestId, "/api/system/status");
  }
}
