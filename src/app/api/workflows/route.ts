import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { listSystemWorkflows } from "@/server/services/operational-intelligence-gateway";

export const dynamic = "force-dynamic";

/** Workflow registry is code-defined reference data (no event PII). */
export function GET(request: Request) {
  const requestId = getRequestIdFromHeaders(request.headers);
  return NextResponse.json(
    {
      ok: true,
      workflows: listSystemWorkflows(),
      requestId,
    },
    { headers: { "x-request-id": requestId } },
  );
}
