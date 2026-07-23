import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getRedDirtRun } from "@/server/services/reddirt-integration-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/integrations/reddirt/runs/${id}`,
    async ({ actor }) => getRedDirtRun(actor, id),
  );
}
