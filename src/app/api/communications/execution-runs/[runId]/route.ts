import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import {
  cancelRun,
  completeRun,
  pauseRun,
  prepareNextBatch,
  resumeRun,
} from "@/server/services/communications-campaign-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { runId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/execution-runs/${runId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      const action = typeof body?.action === "string" ? body.action : "prepare-batch";
      if (action === "prepare-batch") return prepareNextBatch(actor, runId);
      if (action === "pause") {
        return pauseRun(
          actor,
          runId,
          typeof body?.reason === "string" ? body.reason : undefined,
        );
      }
      if (action === "resume") return resumeRun(actor, runId);
      if (action === "cancel") {
        return cancelRun(
          actor,
          runId,
          typeof body?.reason === "string" ? body.reason : undefined,
        );
      }
      if (action === "complete") return completeRun(actor, runId);
      throw new Error(`Unknown action: ${action}`);
    },
  );
}
