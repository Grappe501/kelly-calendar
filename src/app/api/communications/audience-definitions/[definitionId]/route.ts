import { withAuthenticatedMutation } from "@/server/auth/api-mutation";
import {
  approveDefinition,
  submitDefinition,
} from "@/server/services/communications-audience-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ definitionId: string }> };

export async function POST(request: Request, context: Ctx) {
  const { definitionId } = await context.params;
  return withAuthenticatedMutation(
    request,
    `/api/communications/audience-definitions/${definitionId}`,
    async ({ actor }) => {
      const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (body?.action === "approve") {
        return approveDefinition(actor, definitionId);
      }
      return submitDefinition(actor, definitionId);
    },
  );
}
