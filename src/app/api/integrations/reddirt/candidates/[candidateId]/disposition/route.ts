import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import { disposeRedDirtCandidate } from "@/server/services/reddirt-integration-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ candidateId: string }> },
) {
  const { candidateId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/integrations/reddirt/candidates/${candidateId}/disposition`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => ({}))) as {
        disposition?: "APPROVED" | "REJECTED" | "SKIPPED";
      };
      const disposition = body.disposition ?? "APPROVED";
      return disposeRedDirtCandidate(actor, { candidateId, disposition });
    },
  );
}
