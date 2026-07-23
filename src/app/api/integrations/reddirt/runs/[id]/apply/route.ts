import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { applyRedDirtCandidates } from "@/server/services/reddirt-integration-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/integrations/reddirt/runs/${id}/apply`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => ({}))) as {
        candidateIds?: string[];
      };
      return applyRedDirtCandidates({
        actor,
        runId: id,
        candidateIds: Array.isArray(body.candidateIds) ? body.candidateIds : [],
      });
    },
  );
}
