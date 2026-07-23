import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listRegions } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/geography/regions",
    async ({ actor }) => ({ regions: await listRegions(actor) }),
  );
}
