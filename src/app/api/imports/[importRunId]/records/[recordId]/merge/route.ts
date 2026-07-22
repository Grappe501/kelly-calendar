import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { decideImportRecord } from "@/server/services/authenticated-ops-service";
import { ValidationError } from "@/lib/security/safe-error";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ importRunId: string; recordId: string }> };

async function readMergeBody(request: Request): Promise<{
  notes?: string;
  canonicalEventId: string;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ValidationError("canonicalEventId is required for merge.");
  }
  let body: { notes?: unknown; reason?: unknown; canonicalEventId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    throw new ValidationError("canonicalEventId is required for merge.");
  }
  const canonicalEventId =
    typeof body.canonicalEventId === "string" ? body.canonicalEventId.trim() : "";
  if (!canonicalEventId) {
    throw new ValidationError("canonicalEventId is required for merge.");
  }
  return {
    canonicalEventId,
    notes:
      typeof body.notes === "string"
        ? body.notes
        : typeof body.reason === "string"
          ? body.reason
          : undefined,
  };
}

export async function POST(request: Request, context: Ctx) {
  const { importRunId, recordId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/imports/[importRunId]/records/[recordId]/merge",
    async ({ actor, requestId }) => {
      const body = await readMergeBody(request);
      return decideImportRecord({
        actor,
        importRunId,
        recordId,
        decision: "MERGE",
        requestId,
        notes: body.notes,
        canonicalEventId: body.canonicalEventId,
      });
    },
  );
}
