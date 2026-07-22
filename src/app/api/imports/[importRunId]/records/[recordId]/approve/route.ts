import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { decideImportRecord } from "@/server/services/authenticated-ops-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ importRunId: string; recordId: string }> };

async function readOptionalBody(request: Request): Promise<{
  notes?: string;
  canonicalEventId?: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  try {
    const body = (await request.json()) as {
      notes?: unknown;
      reason?: unknown;
      canonicalEventId?: unknown;
    };
    return {
      notes:
        typeof body.notes === "string"
          ? body.notes
          : typeof body.reason === "string"
            ? body.reason
            : undefined,
      canonicalEventId:
        typeof body.canonicalEventId === "string"
          ? body.canonicalEventId
          : undefined,
    };
  } catch {
    return {};
  }
}

export async function POST(request: Request, context: Ctx) {
  const { importRunId, recordId } = await context.params;
  const body = await readOptionalBody(request);
  return withAuthenticatedMutation(
    request,
    "/api/imports/[importRunId]/records/[recordId]/approve",
    async ({ actor, requestId }) =>
      decideImportRecord({
        actor,
        importRunId,
        recordId,
        decision: "APPROVE",
        requestId,
        notes: body.notes,
      }),
  );
}
