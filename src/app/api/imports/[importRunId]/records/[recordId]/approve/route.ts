import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { decideImportRecord } from "@/server/services/authenticated-ops-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ importRunId: string; recordId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { importRunId, recordId } = await context.params;
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
      }),
  );
}
