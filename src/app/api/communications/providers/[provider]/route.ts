import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getProviderDetail } from "@/server/services/communications-dispatch-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

export async function GET(request: Request, context: Ctx) {
  const { provider } = await context.params;
  return withAuthenticatedQuery(
    request,
    "/api/communications/providers/[provider]",
    async ({ actor }) => getProviderDetail(provider, actor),
  );
}
