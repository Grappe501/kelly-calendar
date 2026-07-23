import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listSources } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/geography/sources",
    async ({ actor }) => ({ sources: await listSources(actor) }),
  );
}
