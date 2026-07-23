import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { listCounties } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withAuthenticatedQuery(
    request,
    "/api/geography/counties",
    async ({ actor }) => ({ counties: await listCounties(actor) }),
  );
}
