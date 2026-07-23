import { withAuthenticatedQuery } from "@/server/auth/api-mutation";
import { getPlace } from "@/server/services/geography-foundation-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await context.params;
  return withAuthenticatedQuery(
    request,
    `/api/geography/places/${placeId}`,
    async ({ actor }) => ({ place: await getPlace(actor, placeId) }),
  );
}
