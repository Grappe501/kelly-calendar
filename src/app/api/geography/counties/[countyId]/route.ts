import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getCounty } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ countyId: string }> },
) {
  const { countyId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/geography/counties/${countyId}`,
    async ({ actor }) => ({ county: await getCounty(actor, countyId) }),
  );
}
