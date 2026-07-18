import { NextResponse } from "next/server";
import { getRequestIdFromHeaders } from "@/server/middleware/with-request-context";
import { getSystemWorkflow } from "@/server/services/operational-intelligence-gateway";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ workflowId: string }> };

export async function GET(request: Request, context: Ctx) {
  const requestId = getRequestIdFromHeaders(request.headers);
  const { workflowId } = await context.params;
  const workflow = getSystemWorkflow(workflowId);
  if (!workflow) {
    return NextResponse.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Workflow not found" }, requestId },
      { status: 404, headers: { "x-request-id": requestId } },
    );
  }
  return NextResponse.json(
    { ok: true, workflow, requestId },
    { headers: { "x-request-id": requestId } },
  );
}
