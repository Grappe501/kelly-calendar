import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { applyMobilizeCandidates } from "@/server/services/mobilize-integration-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ runId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { runId } = await context.params;
  return withAuthenticatedMutation(
    request,
    "/api/integrations/mobilize/runs/[runId]/apply",
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as {
        candidateIds?: string[];
      } | null;
      return applyMobilizeCandidates({
        actor,
        runId,
        candidateIds: Array.isArray(body?.candidateIds) ? body!.candidateIds! : [],
      });
    },
  );
}
